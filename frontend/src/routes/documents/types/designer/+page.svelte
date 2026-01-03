<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import FieldLibraryPanel from '$lib/components/FieldLibraryPanel.svelte';

  // State
  let key = $state('');
  let name = $state('');
  let description = $state('');
  let isEditMode = $state(false);
  let isLoading = $state(false);
  let isSaving = $state(false);
  let error = $state('');
  let success = $state('');

  // The schema is basically the FieldLibrary structure
  let schema = $state<{
    fields: any[];
    grids: any[];
  }>({
    fields: [],
    grids: []
  });

  onMount(async () => {
    const keyParam = $page.url.searchParams.get('key');
    if (keyParam) {
      isEditMode = true;
      key = keyParam;
      await loadDocumentType(keyParam);
    }
  });

  async function loadDocumentType(keyParam: string) {
    isLoading = true;
    try {
      const docType = await api.getDocumentType(keyParam);
      key = docType.key;
      name = docType.name;
      description = docType.description || '';
      if (docType.schemaJson) {
        try {
          schema = JSON.parse(docType.schemaJson);
        } catch (e) {
          console.error('Failed to parse schema JSON', e);
        }
      }
    } catch (err) {
      error = 'Failed to load document type';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  async function handleSave() {
    if (!key || !name) {
      error = 'Key and Name are required';
      return;
    }

    isSaving = true;
    error = '';
    success = '';

    const payload = {
      key,
      name,
      description,
      schemaJson: JSON.stringify(schema)
    };

    try {
      if (isEditMode) {
        await api.updateDocumentType(key, payload);
        success = 'Document type updated successfully';
      } else {
        await api.createDocumentType(payload);
        success = 'Document type created successfully';
        // Switch to edit mode logic effectively
        isEditMode = true;
        // Ideally navigate to edit URL to prevent duplicate creation on refresh,
        // but simple success message is fine for now
      }

      setTimeout(() => {
          goto('/documents/types');
      }, 1500);
    } catch (err: any) {
      error = err.message || 'Failed to save document type';
    } finally {
      isSaving = false;
    }
  }

  function handleSchemaChange(newSchema: any) {
    schema = newSchema;
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        {isEditMode ? 'Edit Document Type' : 'Create Document Type'}
      </h1>
      <p class="text-sm text-gray-500">Define the structure for {name || 'a new document'}</p>
    </div>
    <div class="flex gap-3">
      <a
        href="/documents/types"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </a>
      <button
        onclick={handleSave}
        disabled={isSaving}
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Document Type'}
      </button>
    </div>
  </div>

  <div class="flex-1 flex overflow-hidden">
    <!-- Metadata Sidebar -->
    <div class="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      <h3 class="font-semibold text-gray-900 mb-4">Basic Information</h3>

      <div class="space-y-4">
        <div>
          <label for="key" class="block text-sm font-medium text-gray-700 mb-1">Key (ID)</label>
          <input
            id="key"
            type="text"
            bind:value={key}
            disabled={isEditMode}
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            placeholder="e.g. invoice"
          />
          <p class="text-xs text-gray-500 mt-1">Unique identifier. Cannot be changed later.</p>
        </div>

        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Invoice Document"
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="description"
            bind:value={description}
            rows="4"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Describe what this document type is used for..."
          ></textarea>
        </div>
      </div>

      {#if error}
        <div class="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      {/if}
    </div>

    <!-- Designer Area -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow p-6 min-h-[500px]">
           <h3 class="text-lg font-semibold text-gray-900 mb-4">Schema Definition</h3>
           <p class="text-sm text-gray-600 mb-6">
             Define the fields and grids that make up this document.
             These definitions can be used in process forms to automatically generate input fields.
           </p>

           {#if isLoading}
             <div class="text-center py-12">Loading...</div>
           {:else}
             <!-- We reuse the FieldLibraryPanel but treat it as the main editor -->
             <FieldLibraryPanel
               library={schema}
               onChange={handleSchemaChange}
             />
           {/if}
        </div>
      </div>
    </div>
  </div>
</div>
