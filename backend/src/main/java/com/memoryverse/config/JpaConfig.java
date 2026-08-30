package com.memoryverse.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaAuditing
@EnableTransactionManagement
public class JpaConfig {
    // Configures JPA auditing (auto-population of @CreatedDate and @LastModifiedDate)
    // and transaction management across all modular monolith modules.
}
