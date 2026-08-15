package com.tapacademy.learningplatform.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tapacademy.learningplatform.entity.*;
import com.tapacademy.learningplatform.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    @Autowired private QuizRepository quizRepository;
    @Autowired private QuizQuestionRepository questionRepository;
    @Autowired private QuizSubmissionRepository submissionRepository;
    @Autowired private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final DateTimeFormatter DTF = java.time.format.DateTimeFormatter.ofPattern("[yyyy-MM-dd'T'HH:mm:ss][yyyy-MM-dd'T'HH:mm]");

    // =============================================
    // ADMIN ENDPOINTS
    // =============================================

    /** GET /api/quizzes — list all quizzes (admin) */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllQuizzes() {
        List<Quiz> quizzes = quizRepository.findAll();
        List<Map<String, Object>> result = quizzes.stream().map(q -> quizToMap(q, true)).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** GET /api/quizzes/{id} — single quiz detail (admin) */
    @GetMapping("/{id}")
    public ResponseEntity<?> getQuizById(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        List<QuizQuestion> questions = questionRepository.findByQuiz(quiz);
        Map<String, Object> data = quizToMap(quiz, true);
        data.put("questions", questions.stream().map(this::questionToMap).collect(Collectors.toList()));
        return ResponseEntity.ok(data);
    }

    /** POST /api/quizzes — create quiz (admin) */
    @PostMapping
    public ResponseEntity<?> createQuiz(@RequestBody Map<String, Object> body) {
        try {
            Quiz quiz = new Quiz();
            quiz.setTitle((String) body.get("title"));
            quiz.setDescription((String) body.get("description"));
            quiz.setScheduledStart(LocalDateTime.parse((String) body.get("scheduledStart")));
            quiz.setScheduledEnd(LocalDateTime.parse((String) body.get("scheduledEnd")));
            quiz.setDurationMinutes(Integer.parseInt(body.get("durationMinutes").toString()));
            quiz.setTargetStudentIds(body.getOrDefault("targetStudentIds", "ALL").toString());
            quizRepository.save(quiz);
            return ResponseEntity.ok(quizToMap(quiz, true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid data: " + e.getMessage()));
        }
    }

    /** PUT /api/quizzes/{id} — update quiz (admin) */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateQuiz(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        try {
            if (body.containsKey("title")) quiz.setTitle((String) body.get("title"));
            if (body.containsKey("description")) quiz.setDescription((String) body.get("description"));
            if (body.containsKey("scheduledStart"))
                quiz.setScheduledStart(LocalDateTime.parse((String) body.get("scheduledStart")));
            if (body.containsKey("scheduledEnd"))
                quiz.setScheduledEnd(LocalDateTime.parse((String) body.get("scheduledEnd")));
            if (body.containsKey("durationMinutes"))
                quiz.setDurationMinutes(Integer.parseInt(body.get("durationMinutes").toString()));
            if (body.containsKey("targetStudentIds"))
                quiz.setTargetStudentIds(body.get("targetStudentIds").toString());
            quizRepository.save(quiz);
            return ResponseEntity.ok(quizToMap(quiz, true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid data: " + e.getMessage()));
        }
    }

    /** DELETE /api/quizzes/{id} — delete quiz (admin) */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuiz(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        // Delete questions and submissions first
        questionRepository.deleteByQuiz(quiz);
        List<QuizSubmission> subs = submissionRepository.findByQuiz(quiz);
        submissionRepository.deleteAll(subs);
        quizRepository.delete(quiz);
        return ResponseEntity.ok(Map.of("message", "Quiz deleted"));
    }

    /** POST /api/quizzes/{id}/make-live — make quiz live immediately (admin) */
    @PostMapping("/{id}/make-live")
    public ResponseEntity<?> makeQuizLive(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        LocalDateTime now = LocalDateTime.now();
        quiz.setScheduledStart(now);
        quiz.setScheduledEnd(now.plusMinutes(quiz.getDurationMinutes() != null ? quiz.getDurationMinutes() : 30));
        quizRepository.save(quiz);
        return ResponseEntity.ok(quizToMap(quiz, true));
    }

    /** POST /api/quizzes/{id}/complete — mark quiz as completed/end immediately (admin) */
    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeQuiz(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        quiz.setScheduledEnd(LocalDateTime.now());
        quizRepository.save(quiz);
        return ResponseEntity.ok(quizToMap(quiz, true));
    }


    /** POST /api/quizzes/{id}/questions — add question (admin) */
    @PostMapping("/{id}/questions")
    public ResponseEntity<?> addQuestion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        QuizQuestion q = new QuizQuestion();
        q.setQuiz(quiz);
        q.setQuestionText((String) body.get("questionText"));
        q.setQuestionType(body.getOrDefault("questionType", "MCQ").toString());
        q.setOptionA((String) body.get("optionA"));
        q.setOptionB((String) body.get("optionB"));
        q.setOptionC((String) body.get("optionC"));
        q.setOptionD((String) body.get("optionD"));
        q.setCorrectAnswer((String) body.get("correctAnswer"));
        q.setMarks(body.containsKey("marks") ? Integer.valueOf(body.get("marks").toString()) : 1);
        questionRepository.save(q);
        return ResponseEntity.ok(questionToMap(q));
    }

    /** DELETE /api/quizzes/{quizId}/questions/{questionId} — remove question (admin) */
    @DeleteMapping("/{quizId}/questions/{questionId}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long quizId, @PathVariable Long questionId) {
        QuizQuestion q = questionRepository.findById(questionId).orElse(null);
        if (q == null || !q.getQuiz().getId().equals(quizId))
            return ResponseEntity.status(404).body(Map.of("message", "Question not found"));
        questionRepository.delete(q);
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }

    /** GET /api/quizzes/{id}/submissions — view all submissions (admin) */
    @GetMapping("/{id}/submissions")
    public ResponseEntity<?> getSubmissions(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        List<QuizSubmission> subs = submissionRepository.findByQuiz(quiz);
        List<Map<String, Object>> result = subs.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("studentName", s.getStudent().getName());
            m.put("studentEmail", s.getStudent().getEmail());
            m.put("score", s.getScore());
            m.put("totalMarks", s.getTotalMarks());
            m.put("status", s.getStatus());
            m.put("submittedAt", s.getSubmittedAt().toString());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // =============================================
    // STUDENT ENDPOINTS
    // =============================================

    /** GET /api/quizzes/my — list quizzes assigned to current student */
    @GetMapping("/my")
    public ResponseEntity<?> getMyQuizzes() {
        User student = getCurrentStudent();
        if (student == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Quiz> allQuizzes = quizRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Quiz quiz : allQuizzes) {
            if (!isAssignedToStudent(quiz, student)) continue;

            // Find existing submission
            Optional<QuizSubmission> sub = submissionRepository.findByStudentAndQuiz(student, quiz);

            String testStatus;
            if (sub.isPresent()) {
                testStatus = "COMPLETED";
            } else if (now.isBefore(quiz.getScheduledStart())) {
                testStatus = "UPCOMING";
            } else if (now.isAfter(quiz.getScheduledEnd())) {
                testStatus = "EXPIRED";
            } else {
                testStatus = "LIVE";
            }

            Map<String, Object> data = quizToMap(quiz, false);
            data.put("testStatus", testStatus);
            if (sub.isPresent()) {
                data.put("score", sub.get().getScore());
                data.put("totalMarks", sub.get().getTotalMarks());
                data.put("submissionStatus", sub.get().getStatus());
            }
            int questionCount = questionRepository.findByQuiz(quiz).size();
            data.put("questionCount", questionCount);
            result.add(data);
        }

        // Sort: LIVE first, then UPCOMING, then COMPLETED, EXPIRED last
        result.sort((a, b) -> {
            int ra = statusRank((String) a.get("testStatus"));
            int rb = statusRank((String) b.get("testStatus"));
            return Integer.compare(ra, rb);
        });

        return ResponseEntity.ok(result);
    }

    /** GET /api/quizzes/{id}/questions — get questions for student (only during window) */
    @GetMapping("/{id}/questions")
    public ResponseEntity<?> getQuestionsForStudent(@PathVariable Long id) {
        User student = getCurrentStudent();
        if (student == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        if (!isAssignedToStudent(quiz, student))
            return ResponseEntity.status(403).body(Map.of("message", "Not assigned to you"));

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(quiz.getScheduledStart()))
            return ResponseEntity.status(403).body(Map.of("message", "Test has not started yet"));
        if (now.isAfter(quiz.getScheduledEnd()))
            return ResponseEntity.status(403).body(Map.of("message", "Test window has closed"));

        Optional<QuizSubmission> existing = submissionRepository.findByStudentAndQuiz(student, quiz);
        if (existing.isPresent())
            return ResponseEntity.status(409).body(Map.of("message", "Already submitted"));

        List<QuizQuestion> questions = questionRepository.findByQuiz(quiz);
        // Send questions WITHOUT correct answers to student
        List<Map<String, Object>> result = questions.stream().map(q -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", q.getId());
            m.put("questionText", q.getQuestionText());
            m.put("questionType", q.getQuestionType());
            m.put("marks", q.getMarks());
            if ("MCQ".equals(q.getQuestionType())) {
                m.put("optionA", q.getOptionA());
                m.put("optionB", q.getOptionB());
                m.put("optionC", q.getOptionC());
                m.put("optionD", q.getOptionD());
            }
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("quizId", quiz.getId());
        response.put("title", quiz.getTitle());
        response.put("durationMinutes", quiz.getDurationMinutes());
        response.put("scheduledEnd", quiz.getScheduledEnd().toString());
        response.put("questions", result);
        return ResponseEntity.ok(response);
    }

    /** POST /api/quizzes/{id}/submit — submit answers */
    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submitQuiz(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User student = getCurrentStudent();
        if (student == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Quiz quiz = quizRepository.findById(id).orElse(null);
        if (quiz == null) return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
        if (!isAssignedToStudent(quiz, student))
            return ResponseEntity.status(403).body(Map.of("message", "Not assigned to you"));

        Optional<QuizSubmission> existing = submissionRepository.findByStudentAndQuiz(student, quiz);
        if (existing.isPresent())
            return ResponseEntity.status(409).body(Map.of("message", "Already submitted"));

        // Parse answers map: { "questionId": "answer" }
        @SuppressWarnings("unchecked")
        Map<String, String> answers = (Map<String, String>) body.getOrDefault("answers", new HashMap<>());
        String submissionStatus = body.getOrDefault("status", "SUBMITTED").toString();

        // Auto-score
        List<QuizQuestion> questions = questionRepository.findByQuiz(quiz);
        int totalMarks = questions.stream().mapToInt(QuizQuestion::getMarks).sum();
        int score = 0;
        for (QuizQuestion q : questions) {
            String studentAnswer = answers.get(q.getId().toString());
            if (studentAnswer != null && !studentAnswer.isBlank()) {
                String correct = q.getCorrectAnswer();
                if ("CODING".equals(q.getQuestionType())) {
                    // Coding questions require manual grading. They cannot be auto-scored via exact string match.
                    // Score remains 0 for this question until an admin grades it manually.
                } else if ("SHORT_ANSWER".equals(q.getQuestionType()) || "FILL_IN_BLANKS".equals(q.getQuestionType())) {
                    if (studentAnswer.trim().equalsIgnoreCase(correct.trim())) score += q.getMarks();
                } else {
                    if (studentAnswer.trim().equalsIgnoreCase(correct.trim())) score += q.getMarks();
                }
            }
        }

        QuizSubmission submission = new QuizSubmission();
        submission.setQuiz(quiz);
        submission.setStudent(student);
        try {
            submission.setAnswers(objectMapper.writeValueAsString(answers));
        } catch (Exception e) {
            submission.setAnswers("{}");
        }
        submission.setScore(score);
        submission.setTotalMarks(totalMarks);
        submission.setStatus(submissionStatus);
        submission.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(submission);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Submitted successfully");
        result.put("score", score);
        result.put("totalMarks", totalMarks);
        result.put("percentage", totalMarks > 0 ? Math.round((double) score / totalMarks * 100) : 0);
        return ResponseEntity.ok(result);
    }

    // =============================================
    // HELPERS
    // =============================================

    private User getCurrentStudent() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private boolean isAssignedToStudent(Quiz quiz, User student) {
        String targets = quiz.getTargetStudentIds();
        if (targets == null || targets.trim().isEmpty() || "ALL".equalsIgnoreCase(targets.trim())) {
            return true;
        }
        String[] entries = targets.split(",");
        for (String entry : entries) {
            String clean = entry.trim();
            if (clean.equals(student.getId().toString()) || clean.equalsIgnoreCase(student.getEmail())) {
                return true;
            }
        }
        return false;
    }

    private Map<String, Object> quizToMap(Quiz q, boolean includeTargets) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("title", q.getTitle());
        m.put("description", q.getDescription());
        
        m.put("scheduledStart", q.getScheduledStart() != null ? q.getScheduledStart().toString() : "");
        m.put("scheduledEnd", q.getScheduledEnd() != null ? q.getScheduledEnd().toString() : "");
        m.put("durationMinutes", q.getDurationMinutes());
        m.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : "");
        if (includeTargets) m.put("targetStudentIds", q.getTargetStudentIds() != null ? q.getTargetStudentIds() : "ALL");
        
        LocalDateTime now = LocalDateTime.now();
        String testStatus = "EXPIRED";
        if (q.getScheduledStart() != null && q.getScheduledEnd() != null) {
            if (now.isBefore(q.getScheduledStart())) {
                testStatus = "UPCOMING";
            } else if (now.isAfter(q.getScheduledEnd())) {
                testStatus = "EXPIRED";
            } else {
                testStatus = "LIVE";
            }
        }
        m.put("status", testStatus);
        
        return m;
    }

    private Map<String, Object> questionToMap(QuizQuestion q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("questionText", q.getQuestionText());
        m.put("questionType", q.getQuestionType());
        m.put("optionA", q.getOptionA());
        m.put("optionB", q.getOptionB());
        m.put("optionC", q.getOptionC());
        m.put("optionD", q.getOptionD());
        m.put("correctAnswer", q.getCorrectAnswer());
        m.put("marks", q.getMarks());
        return m;
    }

    private int statusRank(String status) {
        return switch (status) {
            case "LIVE" -> 0;
            case "UPCOMING" -> 1;
            case "COMPLETED" -> 2;
            default -> 3;
        };
    }
}
