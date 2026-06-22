package com.tapacademy.learningplatform.repository;

import com.tapacademy.learningplatform.entity.Quiz;
import com.tapacademy.learningplatform.entity.QuizSubmission;
import com.tapacademy.learningplatform.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizSubmissionRepository extends JpaRepository<QuizSubmission, Long> {
    Optional<QuizSubmission> findByStudentAndQuiz(User student, Quiz quiz);
    List<QuizSubmission> findByQuiz(Quiz quiz);
}
