package com.demo.bpm.repository;

import com.demo.bpm.entity.ColumnMapping;
import com.demo.bpm.entity.ColumnMapping.FieldType;
import com.demo.bpm.entity.ColumnMapping.ScopeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ColumnMappingRepository extends JpaRepository<ColumnMapping, Long> {

    /**
     * Find mapping for a document field (with document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.fieldName = :fieldName " +
           "ORDER BY CASE WHEN cm.documentType IS NOT NULL THEN 0 ELSE 1 END")
    List<ColumnMapping> findDocumentFieldMappings(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("fieldName") String fieldName);

    /**
     * Find mapping for a document field (legacy - without document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey AND cm.fieldName = :fieldName")
    Optional<ColumnMapping> findDocumentFieldMapping(
            @Param("processDefKey") String processDefinitionKey,
            @Param("fieldName") String fieldName);

    /**
     * Find mapping for a grid column field (with document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.gridName = :gridName AND cm.fieldName = :fieldName " +
           "ORDER BY CASE WHEN cm.documentType IS NOT NULL THEN 0 ELSE 1 END")
    List<ColumnMapping> findGridFieldMappings(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("gridName") String gridName,
            @Param("fieldName") String fieldName);

    /**
     * Find mapping for a grid column field (legacy - without document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey AND cm.gridName = :gridName AND cm.fieldName = :fieldName")
    Optional<ColumnMapping> findGridFieldMapping(
            @Param("processDefKey") String processDefinitionKey,
            @Param("gridName") String gridName,
            @Param("fieldName") String fieldName);

    /**
     * Get all mappings for a process definition's document fields (with document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL)")
    List<ColumnMapping> findAllDocumentMappings(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType);

    /**
     * Get all mappings for a process definition's document fields (legacy).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey")
    List<ColumnMapping> findAllDocumentMappingsLegacy(@Param("processDefKey") String processDefinitionKey);

    /**
     * Get all mappings for a grid in a process definition (with document type).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.gridName = :gridName")
    List<ColumnMapping> findAllGridMappings(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("gridName") String gridName);

    /**
     * Get all mappings for a grid in a process definition (legacy).
     */
    @Query("SELECT cm FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey AND cm.gridName = :gridName")
    List<ColumnMapping> findAllGridMappingsLegacy(
            @Param("processDefKey") String processDefinitionKey,
            @Param("gridName") String gridName);

    /**
     * Get used column indices for document fields of a specific type (with document type).
     */
    @Query("SELECT CAST(SUBSTRING(cm.columnName, LOCATE('_', cm.columnName) + 1) AS int) " +
           "FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.fieldType = :fieldType")
    Set<Integer> findUsedDocumentColumnIndices(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("fieldType") FieldType fieldType);

    /**
     * Get used column indices for grid fields of a specific type (with document type).
     */
    @Query("SELECT CAST(SUBSTRING(cm.columnName, LOCATE('_', cm.columnName) + 1) AS int) " +
           "FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.gridName = :gridName AND cm.fieldType = :fieldType")
    Set<Integer> findUsedGridColumnIndices(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("gridName") String gridName,
            @Param("fieldType") FieldType fieldType);

    /**
     * Check if a specific column is already used for document scope (with document type).
     */
    @Query("SELECT COUNT(cm) > 0 FROM ColumnMapping cm WHERE cm.scopeType = 'DOCUMENT' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.columnName = :columnName")
    boolean isDocumentColumnUsed(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("columnName") String columnName);

    /**
     * Check if a specific column is already used for grid scope (with document type).
     */
    @Query("SELECT COUNT(cm) > 0 FROM ColumnMapping cm WHERE cm.scopeType = 'GRID' " +
           "AND cm.processDefinitionKey = :processDefKey " +
           "AND (cm.documentType = :documentType OR cm.documentType IS NULL) " +
           "AND cm.gridName = :gridName AND cm.columnName = :columnName")
    boolean isGridColumnUsed(
            @Param("processDefKey") String processDefinitionKey,
            @Param("documentType") String documentType,
            @Param("gridName") String gridName,
            @Param("columnName") String columnName);
}
