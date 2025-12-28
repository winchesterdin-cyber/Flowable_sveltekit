<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import BpmnModeler from 'bpmn-js/lib/Modeler';
  import 'bpmn-js/dist/assets/diagram-js.css';
  import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

  let modelerContainer: HTMLDivElement;
  let modeler: BpmnModeler | null = null;
  let processName = $state('my-process');
  let processDescription = $state('');
  let isDeploying = $state(false);
  let isLoading = $state(false);
  let error = $state('');
  let success = $state('');
  let isEditMode = $state(false);
  let editProcessKey = $state('');

  // Properties Panel State
  let selectedElement = $state<any>(null);
  let showPropertiesPanel = $state(true);
  let elementProperties = $state<{
    id: string;
    name: string;
    type: string;
    assignee?: string;
    candidateGroups?: string;
    formKey?: string;
    documentation?: string;
    scriptFormat?: string;
    script?: string;
    conditionExpression?: string;
  }>({
    id: '',
    name: '',
    type: ''
  });

  // Form Builder State
  let showFormBuilder = $state(false);
  let formFields = $state<Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
    required: boolean;
    validation: string;
    options: string;
    placeholder: string;
    defaultValue: string;
  }>>([]);

  // Script Editor State
  let showScriptEditor = $state(false);
  let scriptCode = $state('');
  let scriptFormat = $state('javascript');

  // Default BPMN template with a simple start -> user task -> end flow
  const defaultBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_1" name="New Process" isExecutable="true">
    <bpmn:startEvent id="startEvent" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="userTask1" name="Review Task" flowable:assignee="\${initiator}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="endEvent" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="startEvent" targetRef="userTask1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="userTask1" targetRef="endEvent"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="process_1">
      <bpmndi:BPMNShape id="startEvent_di" bpmnElement="startEvent">
        <dc:Bounds x="152" y="102" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="158" y="145" width="24" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="userTask1_di" bpmnElement="userTask1">
        <dc:Bounds x="240" y="80" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="endEvent_di" bpmnElement="endEvent">
        <dc:Bounds x="392" y="102" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="400" y="145" width="20" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120"/>
        <di:waypoint x="240" y="120"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120"/>
        <di:waypoint x="392" y="120"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  onMount(async () => {
    // Check for edit mode from URL parameters
    const editParam = $page.url.searchParams.get('edit');
    const processDefId = $page.url.searchParams.get('processDefinitionId');

    // Initialize the BPMN modeler
    modeler = new BpmnModeler({
      container: modelerContainer,
      keyboard: {
        bindTo: document
      }
    });

    // Set up selection change handler for properties panel
    const eventBus = modeler.get('eventBus');
    eventBus.on('selection.changed', (e: any) => {
      const selection = e.newSelection;
      if (selection && selection.length === 1) {
        selectedElement = selection[0];
        loadElementProperties(selection[0]);
      } else {
        selectedElement = null;
        resetElementProperties();
      }
    });

    // Set up element change handler
    eventBus.on('element.changed', (e: any) => {
      if (selectedElement && e.element.id === selectedElement.id) {
        loadElementProperties(e.element);
      }
    });

    try {
      if (editParam || processDefId) {
        // Edit mode - load existing process
        isEditMode = true;
        isLoading = true;
        editProcessKey = editParam || '';

        const processId = processDefId || editParam;
        if (processId) {
          try {
            const response = await api.getProcessBpmn(processId);
            if (response.bpmn) {
              await modeler.importXML(response.bpmn);
              processName = editParam || processId;
              success = `Loaded process: ${processName}`;
              setTimeout(() => (success = ''), 3000);
            } else {
              throw new Error('No BPMN XML returned');
            }
          } catch (loadErr) {
            console.error('Error loading existing process:', loadErr);
            error = `Failed to load process: ${loadErr instanceof Error ? loadErr.message : 'Unknown error'}. Starting with default template.`;
            await modeler.importXML(defaultBpmn);
          }
        }
        isLoading = false;
      } else {
        // New process mode
        await modeler.importXML(defaultBpmn);
      }

      const canvas = modeler.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (err) {
      console.error('Error loading BPMN diagram:', err);
      error = 'Failed to initialize the process modeler';
    }

    return () => {
      if (modeler) {
        modeler.destroy();
      }
    };
  });

  function loadElementProperties(element: any) {
    const businessObject = element.businessObject;

    elementProperties = {
      id: businessObject.id || '',
      name: businessObject.name || '',
      type: element.type,
      assignee: businessObject.get('flowable:assignee') || '',
      candidateGroups: businessObject.get('flowable:candidateGroups') || '',
      formKey: businessObject.get('flowable:formKey') || '',
      documentation: businessObject.documentation?.[0]?.text || '',
      scriptFormat: businessObject.scriptFormat || 'javascript',
      script: businessObject.script?.body || businessObject.script || '',
      conditionExpression: businessObject.conditionExpression?.body || ''
    };

    // Load form fields if present (from documentation or extension elements)
    try {
      const formFieldsJson = businessObject.get('flowable:formFields');
      if (formFieldsJson) {
        formFields = JSON.parse(formFieldsJson);
      }
    } catch {
      formFields = [];
    }

    // Load script for script tasks
    if (element.type === 'bpmn:ScriptTask') {
      scriptCode = elementProperties.script || '';
      scriptFormat = elementProperties.scriptFormat || 'javascript';
    }
  }

  function resetElementProperties() {
    elementProperties = {
      id: '',
      name: '',
      type: ''
    };
    formFields = [];
  }

  function updateElementProperty(property: string, value: string) {
    if (!modeler || !selectedElement) return;

    const modeling = modeler.get('modeling');
    const moddle = modeler.get('moddle');
    const businessObject = selectedElement.businessObject;

    if (property === 'name' || property === 'id') {
      modeling.updateProperties(selectedElement, { [property]: value });
    } else if (property === 'documentation') {
      // Update documentation element
      let documentation = businessObject.documentation;
      if (!documentation || documentation.length === 0) {
        documentation = [moddle.create('bpmn:Documentation', { text: value })];
      } else {
        documentation[0].text = value;
      }
      modeling.updateProperties(selectedElement, { documentation });
    } else if (property === 'conditionExpression') {
      // Update sequence flow condition
      const conditionExpression = moddle.create('bpmn:FormalExpression', { body: value });
      modeling.updateProperties(selectedElement, { conditionExpression });
    } else if (property === 'script') {
      // Update script task script
      modeling.updateProperties(selectedElement, {
        script: value,
        scriptFormat: scriptFormat
      });
    } else if (property.startsWith('flowable:')) {
      // Update Flowable extension attributes
      modeling.updateProperties(selectedElement, { [property]: value });
    }
  }

  function addFormField() {
    formFields = [...formFields, {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      validation: '',
      options: '',
      placeholder: '',
      defaultValue: ''
    }];
  }

  function removeFormField(index: number) {
    formFields = formFields.filter((_, i) => i !== index);
  }

  function saveFormFields() {
    if (!modeler || !selectedElement) return;

    const modeling = modeler.get('modeling');
    const formFieldsJson = JSON.stringify(formFields);

    // Store form fields as a custom attribute
    modeling.updateProperties(selectedElement, {
      'flowable:formFields': formFieldsJson
    });

    success = 'Form fields saved successfully';
    setTimeout(() => (success = ''), 3000);
    showFormBuilder = false;
  }

  function saveScript() {
    if (!modeler || !selectedElement) return;

    updateElementProperty('script', scriptCode);
    success = 'Script saved successfully';
    setTimeout(() => (success = ''), 3000);
    showScriptEditor = false;
  }

  async function handleDeploy() {
    if (!modeler) {
      error = 'Modeler not initialized';
      return;
    }

    if (!processName || processName.trim() === '') {
      error = 'Please enter a process name';
      return;
    }

    isDeploying = true;
    error = '';
    success = '';

    try {
      // Get the BPMN XML from the modeler
      const result = await modeler.saveXML({ format: true });
      const bpmnXml = result.xml;

      if (!bpmnXml) {
        throw new Error('Failed to generate BPMN XML');
      }

      // Deploy the process
      const response = await api.deployProcess(processName, bpmnXml);
      success = response.message || 'Process deployed successfully!';

      // Redirect to processes page after a short delay
      setTimeout(() => {
        goto('/processes');
      }, 2000);
    } catch (err) {
      console.error('Deployment error:', err);
      error = err instanceof Error ? err.message : 'Failed to deploy process';
    } finally {
      isDeploying = false;
    }
  }

  function handleCancel() {
    goto('/processes');
  }

  async function handleExport() {
    if (!modeler) return;

    try {
      const result = await modeler.saveXML({ format: true });
      const bpmnXml = result.xml;

      if (!bpmnXml) {
        throw new Error('Failed to generate BPMN XML');
      }

      // Create a download link
      const blob = new Blob([bpmnXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${processName || 'process'}.bpmn20.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      error = 'Failed to export BPMN diagram';
    }
  }

  async function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !modeler) return;

    try {
      const text = await file.text();
      await modeler.importXML(text);
      const canvas = modeler.get('canvas');
      canvas.zoom('fit-viewport');
      success = 'BPMN diagram imported successfully';
      setTimeout(() => (success = ''), 3000);
    } catch (err) {
      console.error('Import error:', err);
      error = 'Failed to import BPMN diagram';
    }

    // Reset input
    input.value = '';
  }

  function getElementTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'bpmn:StartEvent': 'Start Event',
      'bpmn:EndEvent': 'End Event',
      'bpmn:UserTask': 'User Task',
      'bpmn:ServiceTask': 'Service Task',
      'bpmn:ScriptTask': 'Script Task',
      'bpmn:ExclusiveGateway': 'Exclusive Gateway',
      'bpmn:ParallelGateway': 'Parallel Gateway',
      'bpmn:InclusiveGateway': 'Inclusive Gateway',
      'bpmn:SequenceFlow': 'Sequence Flow',
      'bpmn:Process': 'Process',
      'bpmn:SubProcess': 'Sub Process',
      'bpmn:CallActivity': 'Call Activity'
    };
    return typeMap[type] || type.replace('bpmn:', '');
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="flex h-screen">
    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <div class="border-b border-gray-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Process' : 'Process Designer'}
            </h1>
            <p class="text-sm text-gray-600">
              {isEditMode ? `Editing: ${editProcessKey}` : 'Create and deploy custom BPMN processes'}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick={() => showPropertiesPanel = !showPropertiesPanel}
              class="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {showPropertiesPanel ? 'Hide' : 'Show'} Properties
            </button>
          </div>
        </div>
      </div>

      <!-- Process Metadata Form -->
      <div class="border-b border-gray-200 bg-white p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label for="processName" class="mb-1 block text-sm font-medium text-gray-700">
              Process Key <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="processName"
              bind:value={processName}
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., my-custom-process"
              required
              disabled={isEditMode}
            />
          </div>
          <div>
            <label for="processDescription" class="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              id="processDescription"
              bind:value={processDescription}
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Brief description of the process"
            />
          </div>
        </div>
      </div>

      <!-- Alerts -->
      {#if error}
        <div class="border-b border-red-200 bg-red-50 p-3">
          <div class="flex items-center">
            <svg class="mr-2 h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <p class="text-sm text-red-800">{error}</p>
            <button onclick={() => error = ''} class="ml-auto text-red-600 hover:text-red-800">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      {/if}

      {#if success}
        <div class="border-b border-green-200 bg-green-50 p-3">
          <div class="flex items-center">
            <svg class="mr-2 h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <p class="text-sm text-green-800">{success}</p>
          </div>
        </div>
      {/if}

      {#if isLoading}
        <div class="border-b border-blue-200 bg-blue-50 p-3">
          <div class="flex items-center">
            <svg class="mr-2 h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm text-blue-800">Loading process...</p>
          </div>
        </div>
      {/if}

      <!-- Main Designer Area -->
      <div class="flex flex-1 overflow-hidden">
        <!-- BPMN Modeler -->
        <div class="flex-1">
          <div class="border-b border-gray-200 bg-white p-2">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-700">BPMN Diagram</h2>
              <div class="flex gap-2">
                <label class="cursor-pointer rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
                  Import
                  <input type="file" accept=".bpmn,.bpmn20.xml,.xml" class="hidden" onchange={handleImport}/>
                </label>
                <button onclick={handleExport} class="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
                  Export
                </button>
              </div>
            </div>
          </div>
          <div bind:this={modelerContainer} class="h-full w-full bg-white"></div>
        </div>

        <!-- Properties Panel -->
        {#if showPropertiesPanel}
          <div class="w-80 flex-shrink-0 overflow-y-auto border-l border-gray-200 bg-white">
            <div class="border-b border-gray-200 bg-gray-50 p-3">
              <h3 class="text-sm font-semibold text-gray-900">Properties</h3>
              {#if selectedElement}
                <p class="text-xs text-gray-500">{getElementTypeLabel(elementProperties.type)}</p>
              {:else}
                <p class="text-xs text-gray-500">Select an element to edit</p>
              {/if}
            </div>

            {#if selectedElement}
              <div class="space-y-4 p-4">
                <!-- Basic Properties -->
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700">ID</label>
                  <input
                    type="text"
                    value={elementProperties.id}
                    oninput={(e) => updateElementProperty('id', e.currentTarget.value)}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={elementProperties.name}
                    oninput={(e) => updateElementProperty('name', e.currentTarget.value)}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <!-- User Task Properties -->
                {#if elementProperties.type === 'bpmn:UserTask'}
                  <div class="rounded-md bg-blue-50 p-3">
                    <h4 class="mb-2 text-xs font-semibold text-blue-900">User Task Settings</h4>

                    <div class="mb-3">
                      <label class="mb-1 block text-xs font-medium text-gray-700">Assignee</label>
                      <input
                        type="text"
                        value={elementProperties.assignee}
                        oninput={(e) => updateElementProperty('flowable:assignee', e.currentTarget.value)}
                        placeholder="${initiator}"
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <p class="mt-1 text-xs text-gray-500">Use ${'{'}initiator{'}'} for process starter</p>
                    </div>

                    <div class="mb-3">
                      <label class="mb-1 block text-xs font-medium text-gray-700">Candidate Groups</label>
                      <input
                        type="text"
                        value={elementProperties.candidateGroups}
                        oninput={(e) => updateElementProperty('flowable:candidateGroups', e.currentTarget.value)}
                        placeholder="supervisors,managers"
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <p class="mt-1 text-xs text-gray-500">Comma-separated group names</p>
                    </div>

                    <div class="mb-3">
                      <label class="mb-1 block text-xs font-medium text-gray-700">Form Key</label>
                      <input
                        type="text"
                        value={elementProperties.formKey}
                        oninput={(e) => updateElementProperty('flowable:formKey', e.currentTarget.value)}
                        placeholder="approval-form"
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      onclick={() => showFormBuilder = true}
                      class="w-full rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Configure Form Fields
                    </button>
                  </div>
                {/if}

                <!-- Script Task Properties -->
                {#if elementProperties.type === 'bpmn:ScriptTask'}
                  <div class="rounded-md bg-purple-50 p-3">
                    <h4 class="mb-2 text-xs font-semibold text-purple-900">Script Task Settings</h4>

                    <div class="mb-3">
                      <label class="mb-1 block text-xs font-medium text-gray-700">Script Format</label>
                      <select
                        bind:value={scriptFormat}
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="groovy">Groovy</option>
                        <option value="juel">JUEL Expression</option>
                      </select>
                    </div>

                    <button
                      onclick={() => {
                        scriptCode = elementProperties.script || '';
                        showScriptEditor = true;
                      }}
                      class="w-full rounded bg-purple-600 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                    >
                      Edit Script Code
                    </button>
                  </div>
                {/if}

                <!-- Sequence Flow Properties -->
                {#if elementProperties.type === 'bpmn:SequenceFlow'}
                  <div class="rounded-md bg-orange-50 p-3">
                    <h4 class="mb-2 text-xs font-semibold text-orange-900">Condition Expression</h4>
                    <textarea
                      value={elementProperties.conditionExpression}
                      oninput={(e) => updateElementProperty('conditionExpression', e.currentTarget.value)}
                      placeholder="${'{'}decision == 'approved'{'}'}"
                      rows="3"
                      class="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500">Use ${'{'}variable{'}'} syntax for conditions</p>
                  </div>
                {/if}

                <!-- Documentation -->
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700">Documentation</label>
                  <textarea
                    value={elementProperties.documentation}
                    oninput={(e) => updateElementProperty('documentation', e.currentTarget.value)}
                    placeholder="Describe this element..."
                    rows="3"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>
            {:else}
              <div class="p-4">
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <svg class="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <p class="mt-2 text-sm text-gray-600">Click on an element in the diagram to edit its properties</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      <div class="border-t border-gray-200 bg-white p-4">
        <div class="flex justify-end gap-4">
          <button
            onclick={handleCancel}
            class="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isDeploying}
          >
            Cancel
          </button>
          <button
            onclick={handleDeploy}
            class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isDeploying}
          >
            {isDeploying ? 'Deploying...' : isEditMode ? 'Update Process' : 'Deploy Process'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Form Builder Modal -->
{#if showFormBuilder}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
      <div class="border-b border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Form Builder</h3>
          <button onclick={() => showFormBuilder = false} class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="mt-1 text-sm text-gray-500">Define form fields with validation rules</p>
      </div>

      <div class="p-4">
        {#if formFields.length === 0}
          <div class="rounded-lg bg-gray-50 p-8 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="mt-2 text-gray-600">No form fields defined yet</p>
            <button
              onclick={addFormField}
              class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add First Field
            </button>
          </div>
        {:else}
          <div class="space-y-4">
            {#each formFields as field, index}
              <div class="rounded-lg border border-gray-200 p-4">
                <div class="mb-3 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">Field {index + 1}</span>
                  <button
                    onclick={() => removeFormField(index)}
                    class="text-red-600 hover:text-red-800"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>

                <div class="grid gap-3 md:grid-cols-3">
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Name</label>
                    <input
                      type="text"
                      bind:value={field.name}
                      placeholder="fieldName"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Label</label>
                    <input
                      type="text"
                      bind:value={field.label}
                      placeholder="Field Label"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Type</label>
                    <select
                      bind:value={field.type}
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="textarea">Textarea</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                </div>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Placeholder</label>
                    <input
                      type="text"
                      bind:value={field.placeholder}
                      placeholder="Enter placeholder text"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Default Value</label>
                    <input
                      type="text"
                      bind:value={field.defaultValue}
                      placeholder="Default value"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                {#if field.type === 'select'}
                  <div class="mt-3">
                    <label class="mb-1 block text-xs text-gray-600">Options (comma-separated)</label>
                    <input
                      type="text"
                      bind:value={field.options}
                      placeholder="option1,option2,option3"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                {/if}

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs text-gray-600">Validation Rules</label>
                    <input
                      type="text"
                      bind:value={field.validation}
                      placeholder="required,min:3,max:100"
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        bind:checked={field.required}
                        class="mr-2 rounded border-gray-300"
                      />
                      Required Field
                    </label>
                  </div>
                </div>
              </div>
            {/each}

            <button
              onclick={addFormField}
              class="w-full rounded-md border-2 border-dashed border-gray-300 py-3 text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              + Add Another Field
            </button>
          </div>
        {/if}
      </div>

      <div class="border-t border-gray-200 bg-gray-50 p-4">
        <div class="flex justify-end gap-3">
          <button
            onclick={() => showFormBuilder = false}
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onclick={saveFormFields}
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Form Fields
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Script Editor Modal -->
{#if showScriptEditor}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
      <div class="border-b border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Script Editor</h3>
            <p class="text-sm text-gray-500">Format: {scriptFormat}</p>
          </div>
          <button onclick={() => showScriptEditor = false} class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="p-4">
        <div class="mb-3">
          <label class="mb-1 block text-sm font-medium text-gray-700">Script Format</label>
          <select
            bind:value={scriptFormat}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="javascript">JavaScript (Nashorn/GraalJS)</option>
            <option value="groovy">Groovy</option>
            <option value="juel">JUEL Expression</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="mb-1 block text-sm font-medium text-gray-700">Script Code</label>
          <textarea
            bind:value={scriptCode}
            rows="15"
            class="w-full rounded border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
            placeholder={scriptFormat === 'javascript' ? `// JavaScript example
var amount = execution.getVariable('amount') || 0;
var approvalLevel = 'SUPERVISOR';

if (amount > 50000) {
    approvalLevel = 'EXECUTIVE';
} else if (amount > 10000) {
    approvalLevel = 'MANAGER';
}

execution.setVariable('approvalLevel', approvalLevel);` : scriptFormat === 'groovy' ? `// Groovy example
def amount = execution.getVariable('amount') ?: 0
def approvalLevel = 'SUPERVISOR'

if (amount > 50000) {
    approvalLevel = 'EXECUTIVE'
} else if (amount > 10000) {
    approvalLevel = 'MANAGER'
}

execution.setVariable('approvalLevel', approvalLevel)` : `// JUEL Expression
${'{'}amount > 50000 ? 'EXECUTIVE' : amount > 10000 ? 'MANAGER' : 'SUPERVISOR'{'}'}`}
          ></textarea>
        </div>

        <div class="rounded-lg bg-gray-50 p-3">
          <h4 class="mb-2 text-sm font-medium text-gray-700">Available Variables</h4>
          <ul class="space-y-1 text-xs text-gray-600">
            <li><code class="rounded bg-gray-200 px-1">execution</code> - Process execution context</li>
            <li><code class="rounded bg-gray-200 px-1">execution.getVariable('name')</code> - Get process variable</li>
            <li><code class="rounded bg-gray-200 px-1">execution.setVariable('name', value)</code> - Set process variable</li>
            <li><code class="rounded bg-gray-200 px-1">execution.getProcessInstanceId()</code> - Get process instance ID</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-200 bg-gray-50 p-4">
        <div class="flex justify-end gap-3">
          <button
            onclick={() => showScriptEditor = false}
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onclick={saveScript}
            class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Save Script
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Override bpmn-js default styles for better integration */
  :global(.djs-palette) {
    background-color: white;
    border: 1px solid #e5e7eb;
  }

  :global(.djs-context-pad) {
    background-color: white;
  }

  :global(.bjs-powered-by) {
    display: none;
  }

  :global(.djs-palette-entries) {
    padding: 8px 0;
  }

  :global(.entry) {
    margin: 2px 4px !important;
  }
</style>
