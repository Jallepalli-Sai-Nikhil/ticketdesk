package com.ticketdesk.controller;

import com.ticketdesk.model.User;
import com.ticketdesk.model.UserRole;
import com.ticketdesk.repository.UserRepository;
import com.ticketdesk.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PutMapping("/{username}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable String username, @RequestBody Map<String, String> body) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        
        String roleStr = body.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            UserRole role = UserRole.valueOf(roleStr.toUpperCase());
            user.setRole(role);
            User updatedUser = userRepository.save(user);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{username}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        userRepository.delete(user);
    }
}
