import { fetchApi } from './core';
import type {
  ProcessDefinition,
  ProcessInstance,
  Page,
  User,
  WorkflowHistory,
  Comment,
  FormDefinition
} from '$lib/types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('api.processes');

export const processesApi = {
  /**
   * Fetch all active process definitions.
   * @returns A promise that resolves to an array of process definitions.
   */
  async getProcesses(): Promise<ProcessDefinition[]> {
    log.debug('getProcesses called');
    return fetchApi('/api/processes');
  },

  /**
   * Fetch all process definitions, including suspended ones.
   * @returns A promise that resolves to an array of all process definitions.
   */
  async getAllProcessDefinitions(): Promise<ProcessDefinition[]> {
    log.debug('getAllProcessDefinitions called');
    return fetchApi('/api/processes/definitions');
  },

  /**
   * Start a new process instance.
   * @param processKey - The key of the process definition.
   * @param variables - Initial variables for the process instance.
   * @param businessKey - Optional business key for the process instance.
   * @returns A promise that resolves to the start message and new process instance.
   */
  async startProcess(
    processKey: string,
    variables: Record<string, unknown> = {},
    businessKey?: string
  ): Promise<{ message: string; processInstance: ProcessInstance }> {
    log.debug('startProcess called', { processKey, businessKey });
    const payload: { variables: Record<string, unknown>; businessKey?: string } = { variables };
    if (businessKey) {
      payload.businessKey = businessKey;
    }

    return fetchApi(`/api/processes/${processKey}/start`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Fetch a specific process instance by ID.
   * @param processInstanceId - The ID of the process instance.
   * @returns A promise that resolves to the process instance details.
   */
  async getProcessInstance(processInstanceId: string): Promise<ProcessInstance> {
    log.debug('getProcessInstance called', { processInstanceId });
    return fetchApi(`/api/processes/instance/${processInstanceId}`);
  },

  /**
   * Export a process instance's data as a blob.
   * @param processInstanceId - The ID of the process instance to export.
   * @returns A promise that resolves to a Blob containing the exported data.
   */
  async exportProcessInstance(processInstanceId: string): Promise<Blob> {
    log.debug('exportProcessInstance called', { processInstanceId });
    return fetchApi(`/api/processes/instance/${processInstanceId}/export`, {
      responseType: 'blob'
    });
  },

  /**
   * Cancel (delete) a process instance.
   * @param processInstanceId - The ID of the process instance.
   * @param reason - The reason for cancellation.
   * @returns A promise that resolves to a success message.
   */
  async cancelProcessInstance(
    processInstanceId: string,
    reason: string = 'User cancellation'
  ): Promise<{ message: string }> {
    log.debug('cancelProcessInstance called', { processInstanceId, reason });
    const params = new URLSearchParams();
    if (reason) params.append('reason', reason);
    return fetchApi(`/api/processes/instance/${processInstanceId}?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  /**
   * Suspend a process instance.
   * @param processInstanceId - The ID of the process instance.
   * @returns A promise that resolves to a success message.
   */
  async suspendProcessInstance(processInstanceId: string): Promise<{ message: string }> {
    log.debug('suspendProcessInstance called', { processInstanceId });
    return fetchApi(`/api/processes/instance/${processInstanceId}/suspend`, { method: 'PUT' });
  },

  /**
   * Activate a process instance.
   * @param processInstanceId - The ID of the process instance.
   * @returns A promise that resolves to a success message.
   */
  async activateProcessInstance(processInstanceId: string): Promise<{ message: string }> {
    log.debug('activateProcessInstance called', { processInstanceId });
    return fetchApi(`/api/processes/instance/${processInstanceId}/activate`, { method: 'PUT' });
  },

  /**
   * Fetch processes initiated by the current user.
   * @param page - Page number (default 0).
   * @param size - Page size (default 10).
   * @returns A promise that resolves to a page of process instances.
   */
  async getMyProcesses(page: number = 0, size: number = 10): Promise<Page<ProcessInstance>> {
    log.debug('getMyProcesses called', { page, size });
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    return fetchApi(`/api/processes/my-processes?${params.toString()}`);
  },

  /**
   * Fetch a list of all users.
   * @returns A promise that resolves to an array of users.
   */
  async getUsers(): Promise<User[]> {
    log.debug('getUsers called');
    return fetchApi('/api/processes/users');
  },

  // Workflow History & Processes
  /**
   * Fetch all workflow processes with optional filtering.
   * @param status - Filter by process status.
   * @param processType - Filter by process definition key.
   * @param page - Page number (default 0).
   * @param size - Page size (default 20).
   * @returns A promise that resolves to an array of workflow histories.
   */
  async getAllWorkflowProcesses(
    status?: string,
    processType?: string,
    page: number = 0,
    size: number = 20
  ): Promise<WorkflowHistory[]> {
    log.debug('getAllWorkflowProcesses called', { status, processType, page, size });
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (processType) params.append('processType', processType);
    params.append('page', page.toString());
    params.append('size', size.toString());
    return fetchApi(`/api/workflow/processes?${params.toString()}`);
  },

  /**
   * Fetch the full history of a specific workflow process.
   * @param processInstanceId - The ID of the process instance.
   * @returns A promise that resolves to the workflow history.
   */
  async getWorkflowHistory(processInstanceId: string): Promise<WorkflowHistory> {
    log.debug('getWorkflowHistory called', { processInstanceId });
    return fetchApi(`/api/workflow/processes/${processInstanceId}`);
  },

  /**
   * Add a comment to a process instance.
   * @param processInstanceId - The ID of the process instance.
   * @param message - The comment message.
   * @returns A promise that resolves to the created comment.
   */
  async addComment(
    processInstanceId: string,
    message: string
  ): Promise<{ message: string; comment: Comment }> {
    log.debug('addComment called', { processInstanceId });
    return fetchApi(`/api/workflow/processes/${processInstanceId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  // Process Management
  /**
   * Deploy a new process definition.
   * @param processName - The name of the process.
   * @param bpmnXml - The BPMN 2.0 XML content.
   * @returns A promise that resolves to the deployment result.
   */
  async deployProcess(
    processName: string,
    bpmnXml: string
  ): Promise<{ message: string; process: ProcessDefinition }> {
    log.debug('deployProcess called', { processName });
    return fetchApi('/api/processes/deploy', {
      method: 'POST',
      body: JSON.stringify({ processName, bpmnXml })
    });
  },

  /**
   * Get the BPMN XML for a process definition.
   * @param processDefinitionId - The ID of the process definition.
   * @returns A promise that resolves to an object containing the BPMN XML.
   */
  async getProcessBpmn(processDefinitionId: string): Promise<{ bpmn: string }> {
    log.debug('getProcessBpmn called', { processDefinitionId });
    return fetchApi(`/api/processes/${processDefinitionId}/bpmn`);
  },

  /**
   * Delete a process definition.
   * @param processDefinitionId - The ID of the process definition.
   * @param cascade - Whether to cascade delete running instances (default false).
   * @returns A promise that resolves to a success message.
   */
  async deleteProcess(
    processDefinitionId: string,
    cascade: boolean = false
  ): Promise<{ message: string }> {
    log.debug('deleteProcess called', { processDefinitionId, cascade });
    return fetchApi(`/api/processes/${processDefinitionId}?cascade=${cascade}`, {
      method: 'DELETE'
    });
  },

  /**
   * Suspend a process definition.
   * @param processDefinitionId - The ID of the process definition.
   * @returns A promise that resolves to a success message.
   */
  async suspendProcess(processDefinitionId: string): Promise<{ message: string }> {
    log.debug('suspendProcess called', { processDefinitionId });
    return fetchApi(`/api/processes/${processDefinitionId}/suspend`, { method: 'PUT' });
  },

  /**
   * Activate a suspended process definition.
   * @param processDefinitionId - The ID of the process definition.
   * @returns A promise that resolves to a success message.
   */
  async activateProcess(processDefinitionId: string): Promise<{ message: string }> {
    log.debug('activateProcess called', { processDefinitionId });
    return fetchApi(`/api/processes/${processDefinitionId}/activate`, { method: 'PUT' });
  },

  /**
   * Update the category of a process definition.
   * @param processDefinitionId - The ID of the process definition.
   * @param category - The new category.
   * @returns A promise that resolves to a success message.
   */
  async updateProcessCategory(
    processDefinitionId: string,
    category: string
  ): Promise<{ message: string }> {
    log.debug('updateProcessCategory called', { processDefinitionId, category });
    return fetchApi(`/api/processes/${processDefinitionId}/category`, {
      method: 'PUT',
      body: JSON.stringify({ category })
    });
  },

  // Form Definitions
  /**
   * Get the start form definition for a process.
   * @param processDefinitionId - The ID of the process definition.
   * @returns A promise that resolves to the form definition.
   */
  async getStartFormDefinition(processDefinitionId: string): Promise<FormDefinition> {
    log.debug('getStartFormDefinition called', { processDefinitionId });
    return fetchApi(`/api/processes/${processDefinitionId}/start-form`);
  },

  /**
   * Get all form definitions associated with a process.
   * @param processDefinitionId - The ID of the process definition.
   * @returns A promise that resolves to a map of form definitions.
   */
  async getAllFormDefinitions(
    processDefinitionId: string
  ): Promise<Record<string, FormDefinition>> {
    log.debug('getAllFormDefinitions called', { processDefinitionId });
    return fetchApi(`/api/processes/${processDefinitionId}/forms`);
  },

  /**
   * Get the form definition for a specific element within a process.
   * @param processDefinitionId - The ID of the process definition.
   * @param elementId - The ID of the BPMN element (e.g., user task).
   * @returns A promise that resolves to the form definition.
   */
  async getElementFormDefinition(
    processDefinitionId: string,
    elementId: string
  ): Promise<FormDefinition> {
    log.debug('getElementFormDefinition called', { processDefinitionId, elementId });
    return fetchApi(`/api/processes/${processDefinitionId}/forms/${elementId}`);
  }
};
