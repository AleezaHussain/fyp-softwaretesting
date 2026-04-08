package supabase.entities;

import java.time.LocalDateTime;

public class Simulation {
    private Long id;
    private Long userId;
    private String name;
    private String description;
    private String simulationType; // 'evaporative', 'chilled_water', 'air_economizer', etc.
    private String status; // 'pending', 'running', 'completed', 'failed'
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructor
    public Simulation(Long userId, String name, String description, String simulationType) {
        this.userId = userId;
        this.name = name;
        this.description = description;
        this.simulationType = simulationType;
        this.status = "pending";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Simulation(Long id, Long userId, String name, String description, String simulationType,
                      String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.description = description;
        this.simulationType = simulationType;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }

    public String getSimulationType() {
        return simulationType;
    }

    public void setSimulationType(String simulationType) {
        this.simulationType = simulationType;
        this.updatedAt = LocalDateTime.now();
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public String toString() {
        return "Simulation{" +
                "id=" + id +
                ", userId=" + userId +
                ", name='" + name + '\'' +
                ", simulationType='" + simulationType + '\'' +
                ", status='" + status + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
