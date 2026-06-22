package com.tapacademy.learningplatform.repository;

import com.tapacademy.learningplatform.entity.Quiz;
import com.tapacademy.learningplatform.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByQuiz(Quiz quiz);
    void deleteByQuiz(Quiz quiz);
}
