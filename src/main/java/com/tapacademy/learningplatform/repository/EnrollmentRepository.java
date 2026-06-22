package com.tapacademy.learningplatform.repository;

import com.tapacademy.learningplatform.entity.Enrollment;
import com.tapacademy.learningplatform.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByUser(User user);
    List<Enrollment> findAllByOrderByIdDesc();
}
