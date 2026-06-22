package com.tapacademy.learningplatform.controller;

import com.tapacademy.learningplatform.entity.Course;
import com.tapacademy.learningplatform.repository.CourseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private CourseRepository courseRepository;

    @GetMapping
    public ResponseEntity<List<Course>> getAllCourses() {
        return ResponseEntity.ok(courseRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(course -> ResponseEntity.ok((Object) course))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCourse(@RequestBody Course course) {
        if (course.getTitle() == null || course.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Course title is required."));
        }
        if (course.getAuthor() == null || course.getAuthor().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Course author is required."));
        }
        if (course.getModules() == null) course.setModules(0);
        if (course.getDuration() == null) course.setDuration("0 Hr");
        Course saved = courseRepository.save(course);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody Course updatedCourse) {
        return courseRepository.findById(id)
                .map(course -> {
                    if (updatedCourse.getTitle() != null && !updatedCourse.getTitle().isBlank())
                        course.setTitle(updatedCourse.getTitle());
                    if (updatedCourse.getAuthor() != null && !updatedCourse.getAuthor().isBlank())
                        course.setAuthor(updatedCourse.getAuthor());
                    if (updatedCourse.getImage() != null)
                        course.setImage(updatedCourse.getImage());
                    if (updatedCourse.getVideo() != null)
                        course.setVideo(updatedCourse.getVideo());
                    if (updatedCourse.getModules() != null)
                        course.setModules(updatedCourse.getModules());
                    if (updatedCourse.getDuration() != null)
                        course.setDuration(updatedCourse.getDuration());
                    Course saved = courseRepository.save(course);
                    return ResponseEntity.ok((Object) saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        if (!courseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        courseRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Course deleted successfully."));
    }
}
