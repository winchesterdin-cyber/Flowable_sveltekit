package com.demo.bpm.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "slas")
@Data
public class SLA {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    // Target can be a process definition key or a specific task definition key
    @Column(nullable = false)
    private String targetKey;
    
    // PROCESS or TASK
    @Enumerated(EnumType.STRING)
    private SLATargetType targetType;
    
    // Duration in ISO-8601 format (e.g. PT4H for 4 hours)
    @Column(nullable = false)
    private Duration duration;
    
    // Warning threshold (e.g. notify when 80% of time used)
    private Integer warningThresholdPercentage;
    
    private boolean enabled = true;
    
    public enum SLATargetType {
        PROCESS,
        TASK
    }
}
