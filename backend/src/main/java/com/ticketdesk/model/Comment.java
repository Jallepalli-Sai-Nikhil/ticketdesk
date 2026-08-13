package com.ticketdesk.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @NotBlank(message = "Author is required")
    @Column(nullable = false)
    private String author;

    @NotBlank(message = "Text is required")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Default Constructor
    public Comment() {
    }

    // All-args Constructor
    public Comment(Long id, Long ticketId, String author, String text, LocalDateTime createdAt) {
        this.id = id;
        this.ticketId = ticketId;
        this.author = author;
        this.text = text;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public void setTicketId(Long ticketId) {
        this.ticketId = ticketId;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Builder Pattern
    public static CommentBuilder builder() {
        return new CommentBuilder();
    }

    public static class CommentBuilder {
        private Long id;
        private Long ticketId;
        private String author;
        private String text;
        private LocalDateTime createdAt;

        CommentBuilder() {
        }

        public CommentBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public CommentBuilder ticketId(Long ticketId) {
            this.ticketId = ticketId;
            return this;
        }

        public CommentBuilder author(String author) {
            this.author = author;
            return this;
        }

        public CommentBuilder text(String text) {
            this.text = text;
            return this;
        }

        public CommentBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Comment build() {
            return new Comment(this.id, this.ticketId, this.author, this.text, this.createdAt);
        }

        @Override
        public String toString() {
            return "Comment.CommentBuilder(id=" + this.id + ", ticketId=" + this.ticketId + ", author=" + this.author + ", text=" + this.text + ", createdAt=" + this.createdAt + ")";
        }
    }

    // Equals, Hashcode, and ToString
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Comment comment = (Comment) o;
        return java.util.Objects.equals(id, comment.id) &&
               java.util.Objects.equals(ticketId, comment.ticketId) &&
               java.util.Objects.equals(author, comment.author) &&
               java.util.Objects.equals(text, comment.text) &&
               java.util.Objects.equals(createdAt, comment.createdAt);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id, ticketId, author, text, createdAt);
    }

    @Override
    public String toString() {
        return "Comment(id=" + id + ", ticketId=" + ticketId + ", author=" + author + ", text=" + text + ", createdAt=" + createdAt + ")";
    }
}
