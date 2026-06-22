package com.tapacademy.learningplatform.repository;

import com.tapacademy.learningplatform.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
}
