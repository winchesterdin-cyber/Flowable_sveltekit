package com.demo.bpm.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProcessDTO {
    private String id;
    private String key;
    private String name;
    private String description;
    private Integer version;
    private String category;
    private boolean suspended;
}
