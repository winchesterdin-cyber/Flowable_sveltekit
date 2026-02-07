package com.demo.bpm.controller;

import com.demo.bpm.entity.DocumentTypeDefinition;
import com.demo.bpm.exception.GlobalExceptionHandler;
import com.demo.bpm.service.DocumentTypeService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentTypeController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class DocumentTypeControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentTypeService documentTypeService;

    @Test
    @WithMockUser
    void createDocumentType_requiresKeyAndName() throws Exception {
        mockMvc.perform(post("/api/document-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.key").value("key is required"))
                .andExpect(jsonPath("$.fieldErrors.name").value("name is required"))
                .andExpect(jsonPath("$.path").value("/api/document-types"));
    }

    @Test
    @WithMockUser
    void updateDocumentType_requiresNameAndAlignsKey() throws Exception {
        when(documentTypeService.updateDocumentType(org.mockito.Mockito.eq("invoice"), org.mockito.Mockito.any(DocumentTypeDefinition.class)))
                .thenReturn(DocumentTypeDefinition.builder().key("invoice").name("Invoice").build());

        mockMvc.perform(put("/api/document-types/invoice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Invoice\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Invoice"))
                .andExpect(jsonPath("$.key").value("invoice"));

        ArgumentCaptor<DocumentTypeDefinition> captor = ArgumentCaptor.forClass(DocumentTypeDefinition.class);
        verify(documentTypeService).updateDocumentType(org.mockito.Mockito.eq("invoice"), captor.capture());
        // Controller should align body key with path variable
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getKey()).isEqualTo("invoice");
    }
}
