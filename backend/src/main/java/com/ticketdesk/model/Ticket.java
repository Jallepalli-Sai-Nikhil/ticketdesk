package com.ticketdesk.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is required")
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status;

    @NotNull(message = "Priority is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketPriority priority;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "reported_by")
    private String reportedBy;

    @NotNull(message = "Category is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketCategory category;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "attachment_key")
    private String attachmentKey;

    // Default Constructor
    public Ticket() {
    }

    // All-args Constructor
    public Ticket(Long id, String title, String description, TicketStatus status, TicketPriority priority, LocalDateTime createdAt, LocalDateTime updatedAt, String reportedBy, TicketCategory category, String assignedTo, String resolution, String attachmentKey) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.reportedBy = reportedBy;
        this.category = category;
        this.assignedTo = assignedTo;
        this.resolution = resolution;
        this.attachmentKey = attachmentKey;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public void setPriority(TicketPriority priority) {
        this.priority = priority;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(String reportedBy) {
        this.reportedBy = reportedBy;
    }

    public TicketCategory getCategory() {
        return category;
    }

    public void setCategory(TicketCategory category) {
        this.category = category;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getAttachmentKey() {
        return attachmentKey;
    }

    public void setAttachmentKey(String attachmentKey) {
        this.attachmentKey = attachmentKey;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = TicketStatus.OPEN;
        }
        if (priority == null) {
            priority = TicketPriority.LOW;
        }
        if (reportedBy == null) {
            reportedBy = "anonymous";
        }
        if (category == null) {
            category = TicketCategory.SOFTWARE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Builder Pattern
    public static TicketBuilder builder() {
        return new TicketBuilder();
    }

    public static class TicketBuilder {
        private Long id;
        private String title;
        private String description;
        private TicketStatus status;
        private TicketPriority priority;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private String reportedBy;
        private TicketCategory category;
        private String assignedTo;
        private String resolution;
        private String attachmentKey;

        TicketBuilder() {
        }

        public TicketBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public TicketBuilder title(String title) {
            this.title = title;
            return this;
        }

        public TicketBuilder description(String description) {
            this.description = description;
            return this;
        }

        public TicketBuilder status(TicketStatus status) {
            this.status = status;
            return this;
        }

        public TicketBuilder priority(TicketPriority priority) {
            this.priority = priority;
            return this;
        }

        public TicketBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public TicketBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public TicketBuilder reportedBy(String reportedBy) {
            this.reportedBy = reportedBy;
            return this;
        }

        public TicketBuilder category(TicketCategory category) {
            this.category = category;
            return this;
        }

        public TicketBuilder assignedTo(String assignedTo) {
            this.assignedTo = assignedTo;
            return this;
        }

        public TicketBuilder resolution(String resolution) {
            this.resolution = resolution;
            return this;
        }

        public TicketBuilder attachmentKey(String attachmentKey) {
            this.attachmentKey = attachmentKey;
            return this;
        }

        public Ticket build() {
            return new Ticket(this.id, this.title, this.description, this.status, this.priority, this.createdAt, this.updatedAt, this.reportedBy, this.category, this.assignedTo, this.resolution, this.attachmentKey);
        }

        @Override
        public String toString() {
            return "Ticket.TicketBuilder(id=" + this.id + ", title=" + this.title + ", description=" + this.description + ", status=" + this.status + ", priority=" + this.priority + ", createdAt=" + this.createdAt + ", updatedAt=" + this.updatedAt + ", reportedBy=" + this.reportedBy + ", category=" + this.category + ", assignedTo=" + this.assignedTo + ", resolution=" + this.resolution + ", attachmentKey=" + this.attachmentKey + ")";
        }
    }

    // Equals, Hashcode, and ToString
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Ticket ticket = (Ticket) o;
        return java.util.Objects.equals(id, ticket.id) &&
               java.util.Objects.equals(title, ticket.title) &&
               java.util.Objects.equals(description, ticket.description) &&
               status == ticket.status &&
               priority == ticket.priority &&
               java.util.Objects.equals(createdAt, ticket.createdAt) &&
               java.util.Objects.equals(updatedAt, ticket.updatedAt) &&
               java.util.Objects.equals(reportedBy, ticket.reportedBy) &&
               category == ticket.category &&
               java.util.Objects.equals(assignedTo, ticket.assignedTo) &&
               java.util.Objects.equals(resolution, ticket.resolution) &&
               java.util.Objects.equals(attachmentKey, ticket.attachmentKey);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id, title, description, status, priority, createdAt, updatedAt, reportedBy, category, assignedTo, resolution, attachmentKey);
    }

    @Override
    public String toString() {
        return "Ticket(id=" + id + ", title=" + title + ", description=" + description + ", status=" + status + ", priority=" + priority + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + ", reportedBy=" + reportedBy + ", category=" + category + ", assignedTo=" + assignedTo + ", resolution=" + resolution + ", attachmentKey=" + attachmentKey + ")";
    }
}
