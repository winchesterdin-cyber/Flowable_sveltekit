package com.demo.bpm.repository;

import com.demo.bpm.entity.SLA;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SLARepository extends JpaRepository<SLA, String> {
    
    Optional<SLA> findByTargetKeyAndTargetType(String targetKey, SLA.SLATargetType targetType);
    
}
