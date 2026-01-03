package com.demo.bpm.repository;

import com.demo.bpm.entity.DocumentTypeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentTypeRepository extends JpaRepository<DocumentTypeDefinition, Long> {
    Optional<DocumentTypeDefinition> findByKey(String key);
    boolean existsByKey(String key);
}
