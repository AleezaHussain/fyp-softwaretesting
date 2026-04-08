package supabase.entities;

import java.time.LocalDateTime;

public class User {
    private Long id;
    private String authUserId;
    private String name;
    private String email;
    private String passwordHash;
    private String role;
    private Integer simulationsRan;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructor
    public User(String authUserId, String name, String email, String passwordHash, String role) {
        this.authUserId = authUserId;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.simulationsRan = 0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public User(Long id, String authUserId, String name, String email, String passwordHash, String role,
                Integer simulationsRan, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.authUserId = authUserId;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.simulationsRan = simulationsRan;
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

    public String getAuthUserId() {
        return authUserId;
    }

    public void setAuthUserId(String authUserId) {
        this.authUserId = authUserId;
        this.updatedAt = LocalDateTime.now();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
        this.updatedAt = LocalDateTime.now();
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        this.updatedAt = LocalDateTime.now();
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
        this.updatedAt = LocalDateTime.now();
    }

    public Integer getSimulationsRan() {
        return simulationsRan;
    }

    public void setSimulationsRan(Integer simulationsRan) {
        this.simulationsRan = simulationsRan;
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
        return "User{" +
                "id=" + id +
            ", authUserId='" + authUserId + '\'' +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
            ", role='" + role + '\'' +
            ", simulationsRan=" + simulationsRan +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
