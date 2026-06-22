package com.tapacademy.learningplatform.controller;

import com.tapacademy.learningplatform.entity.Course;
import com.tapacademy.learningplatform.entity.Enrollment;
import com.tapacademy.learningplatform.entity.User;
import com.tapacademy.learningplatform.repository.CourseRepository;
import com.tapacademy.learningplatform.repository.EnrollmentRepository;
import com.tapacademy.learningplatform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllStudents() {
        List<User> students = userRepository.findAll().stream()
                .filter(u -> "ROLE_STUDENT".equals(u.getRole()))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User student : students) {
            List<Enrollment> enrollments = enrollmentRepository.findByUser(student);
            Map<String, Object> studentData = new HashMap<>();
            studentData.put("id", student.getId());
            studentData.put("name", student.getName());
            studentData.put("email", student.getEmail());
            studentData.put("timeSpentPortal", student.getTimeSpentPortal());
            studentData.put("enrollments", enrollments.stream().map(e -> {
                Map<String, Object> enrollMap = new HashMap<>();
                enrollMap.put("courseTitle", e.getCourse().getTitle());
                enrollMap.put("progress", e.getProgress());
                enrollMap.put("status", e.getStatus());
                return enrollMap;
            }).toList());
            result.add(studentData);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/enrollments")
    public ResponseEntity<List<Map<String, Object>>> getAllEnrollments() {
        List<Enrollment> enrollments = enrollmentRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Enrollment e : enrollments) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", e.getId());
            entry.put("studentName", e.getUser().getName());
            entry.put("studentEmail", e.getUser().getEmail());
            entry.put("courseTitle", e.getCourse().getTitle());
            entry.put("progress", e.getProgress());
            entry.put("status", e.getStatus());
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getStudentCount() {
        long count = userRepository.findAll().stream()
                .filter(u -> "ROLE_STUDENT".equals(u.getRole()))
                .count();
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        List<User> students = userRepository.findAll().stream()
                .filter(u -> "ROLE_STUDENT".equals(u.getRole()))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User student : students) {
            List<Enrollment> enrollments = enrollmentRepository.findByUser(student);
            int totalProgress = enrollments.stream().mapToInt(Enrollment::getProgress).sum();
            int timeSpent = student.getTimeSpentPortal() != null ? student.getTimeSpentPortal() : 0;
            // score logic: 10 points per progress %, 5 points per minute on portal
            int score = totalProgress * 10 + timeSpent * 5;

            Map<String, Object> lbEntry = new HashMap<>();
            lbEntry.put("name", student.getName());
            lbEntry.put("score", score);
            lbEntry.put("email", student.getEmail());
            result.add(lbEntry);
        }

        // Sort by score descending
        result.sort((a, b) -> Integer.compare((Integer) b.get("score"), (Integer) a.get("score")));

        // Limit to top 10
        List<Map<String, Object>> topTen = result.stream().limit(10).toList();
        return ResponseEntity.ok(topTen);
    }

    @GetMapping("/my-enrollments")
    public ResponseEntity<?> getMyEnrollments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String email = auth.getName();
        User student = userRepository.findByEmail(email).orElse(null);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Student not found"));
        }
        List<Enrollment> enrollments = enrollmentRepository.findByUser(student);
        List<Map<String, Object>> result = enrollments.stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("courseId", e.getCourse().getId());
            map.put("courseTitle", e.getCourse().getTitle());
            map.put("courseImage", e.getCourse().getImage());
            map.put("courseVideo", e.getCourse().getVideo());
            map.put("modules", e.getCourse().getModules());
            map.put("duration", e.getCourse().getDuration());
            map.put("progress", e.getProgress());
            map.put("status", e.getStatus());
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/enroll/{courseId}")
    public ResponseEntity<?> enrollInCourse(@PathVariable Long courseId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String email = auth.getName();
        User student = userRepository.findByEmail(email).orElse(null);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Student not found"));
        }
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Course not found"));
        }

        // Check if already enrolled
        List<Enrollment> existing = enrollmentRepository.findByUser(student);
        boolean alreadyEnrolled = existing.stream().anyMatch(e -> e.getCourse().getId().equals(courseId));
        if (alreadyEnrolled) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already enrolled in this course"));
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setProgress(0);
        enrollment.setTimeSpentCourse(0);
        enrollment.setStatus("Active");

        enrollmentRepository.save(enrollment);
        return ResponseEntity.ok(Map.of("message", "Enrolled successfully"));
    }

    @PostMapping("/progress")
    public ResponseEntity<?> updateProgress(@RequestBody Map<String, Object> payload) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String email = auth.getName();
        User student = userRepository.findByEmail(email).orElse(null);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Student not found"));
        }

        if (payload.get("courseId") == null || payload.get("progress") == null || payload.get("timeSpent") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields (courseId, progress, timeSpent)"));
        }

        Long courseId = Long.valueOf(payload.get("courseId").toString());
        Integer progress = Integer.valueOf(payload.get("progress").toString());
        Integer additionalTime = Integer.valueOf(payload.get("timeSpent").toString()); // in minutes

        List<Enrollment> enrollments = enrollmentRepository.findByUser(student);
        Enrollment enrollment = enrollments.stream()
                .filter(e -> e.getCourse().getId().equals(courseId))
                .findFirst()
                .orElse(null);

        if (enrollment == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Enrollment not found"));
        }

        // Update progress (only if new progress is higher)
        if (progress > enrollment.getProgress()) {
            enrollment.setProgress(Math.min(progress, 100));
            if (enrollment.getProgress() >= 100) {
                enrollment.setStatus("Completed");
            }
        }

        // Update course time spent
        enrollment.setTimeSpentCourse(enrollment.getTimeSpentCourse() + additionalTime);
        enrollmentRepository.save(enrollment);

        // Update student portal time spent
        student.setTimeSpentPortal((student.getTimeSpentPortal() != null ? student.getTimeSpentPortal() : 0) + additionalTime);
        userRepository.save(student);

        return ResponseEntity.ok(Map.of("message", "Progress updated successfully"));
    }
}
