package com.demo.bpm.service;

import com.demo.bpm.entity.DocumentTypeDefinition;
import com.demo.bpm.repository.DocumentTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DocumentTypeService {

    private final DocumentTypeRepository repository;

    public List<DocumentTypeDefinition> getAllDocumentTypes() {
        return repository.findAll();
    }

    public Optional<DocumentTypeDefinition> getDocumentTypeByKey(String key) {
        return repository.findByKey(key);
    }

    @Transactional
    public DocumentTypeDefinition createDocumentType(DocumentTypeDefinition documentType) {
        if (repository.existsByKey(documentType.getKey())) {
            throw new IllegalArgumentException("Document type with key " + documentType.getKey() + " already exists");
        }
        return repository.save(documentType);
    }

    @Transactional
    public DocumentTypeDefinition updateDocumentType(String key, DocumentTypeDefinition updatedInfo) {
        DocumentTypeDefinition existing = repository.findByKey(key)
                .orElseThrow(() -> new IllegalArgumentException("Document type with key " + key + " not found"));

        existing.setName(updatedInfo.getName());
        existing.setDescription(updatedInfo.getDescription());
        existing.setSchemaJson(updatedInfo.getSchemaJson());

        return repository.save(existing);
    }

    @Transactional
    public void deleteDocumentType(String key) {
        DocumentTypeDefinition existing = repository.findByKey(key)
                .orElseThrow(() -> new IllegalArgumentException("Document type with key " + key + " not found"));
        repository.delete(existing);
    }
}
