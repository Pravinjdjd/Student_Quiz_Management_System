package com.tapacademy.learningplatform;

import com.tapacademy.learningplatform.entity.User;
import com.tapacademy.learningplatform.entity.Course;
import com.tapacademy.learningplatform.entity.Enrollment;
import com.tapacademy.learningplatform.repository.UserRepository;
import com.tapacademy.learningplatform.repository.CourseRepository;
import com.tapacademy.learningplatform.repository.EnrollmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;

@SpringBootApplication
public class LearningPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(LearningPlatformApplication.class, args);
	}

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, 
                                      CourseRepository courseRepository, 
                                      EnrollmentRepository enrollmentRepository, 
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Initialize Admin
            if (userRepository.findByEmail("admin@tapacademy.com").isEmpty()) {
                User admin = new User();
                admin.setName("Platform Admin");
                admin.setEmail("admin@tapacademy.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ROLE_ADMIN");
                admin.setTimeSpentPortal(0);
                userRepository.save(admin);
                System.out.println("Default admin user created: admin@tapacademy.com / admin123");
            }

            // 2. Initialize Default Courses
            if (courseRepository.count() == 0) {
                Course course1 = new Course();
                course1.setTitle("Java Full Stack Web Development");
                course1.setAuthor("Error Makes Clever");
                course1.setImage("https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60");
                course1.setVideo("https://www.youtube.com/embed/yRpLlJS_SIs");
                course1.setModules(45);
                course1.setDuration("18 Hr");
                courseRepository.save(course1);

                Course course2 = new Course();
                course2.setTitle("HTML & CSS Crash Course");
                course2.setAuthor("SuperSimpleDev");
                course2.setImage("https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60");
                course2.setVideo("https://www.youtube.com/embed/G3e-cpL7ofc");
                course2.setModules(25);
                course2.setDuration("6.5 Hr");
                courseRepository.save(course2);

                Course course3 = new Course();
                course3.setTitle("Data Structures and Algorithms");
                course3.setAuthor("Jenny's Lectures");
                course3.setImage("https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&auto=format&fit=crop&q=60");
                course3.setVideo("https://www.youtube.com/embed/5_5oE5l978U");
                course3.setModules(30);
                course3.setDuration("12 Hr");
                courseRepository.save(course3);

                Course course4 = new Course();
                course4.setTitle("Advanced Java Masterclass");
                course4.setAuthor("Java Brains");
                course4.setImage("https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=60");
                course4.setVideo("https://www.youtube.com/embed/e5q7F5yZJc8");
                course4.setModules(15);
                course4.setDuration("8 Hr");
                courseRepository.save(course4);

                System.out.println("Default courses initialized.");
            }

            // 3. Initialize Default Students & Enrollments (for rankings & leaderboard)
            if (userRepository.findAll().stream().filter(u -> "ROLE_STUDENT".equals(u.getRole())).count() == 0) {
                // Create student 1
                User hemanth = new User();
                hemanth.setName("Hemanth Reddy");
                hemanth.setEmail("hemanth@tapacademy.com");
                hemanth.setPassword(passwordEncoder.encode("student123"));
                hemanth.setRole("ROLE_STUDENT");
                hemanth.setTimeSpentPortal(180);
                userRepository.save(hemanth);

                // Create student 2
                User nagulapally = new User();
                nagulapally.setName("Nagulapally");
                nagulapally.setEmail("nagulapally@tapacademy.com");
                nagulapally.setPassword(passwordEncoder.encode("student123"));
                nagulapally.setRole("ROLE_STUDENT");
                nagulapally.setTimeSpentPortal(120);
                userRepository.save(nagulapally);

                // Create student 3
                User dhinakar = new User();
                dhinakar.setName("Dhinakar");
                dhinakar.setEmail("dhinakar@tapacademy.com");
                dhinakar.setPassword(passwordEncoder.encode("student123"));
                dhinakar.setRole("ROLE_STUDENT");
                dhinakar.setTimeSpentPortal(90);
                userRepository.save(dhinakar);

                // Enroll students in courses to generate stats
                List<Course> courses = courseRepository.findAll();
                if (courses.size() >= 3) {
                    // Enroll Hemanth
                    Enrollment e1 = new Enrollment();
                    e1.setUser(hemanth);
                    e1.setCourse(courses.get(0));
                    e1.setProgress(75);
                    e1.setTimeSpentCourse(120);
                    e1.setStatus("Active");
                    enrollmentRepository.save(e1);

                    Enrollment e2 = new Enrollment();
                    e2.setUser(hemanth);
                    e2.setCourse(courses.get(1));
                    e2.setProgress(100);
                    e2.setTimeSpentCourse(60);
                    e2.setStatus("Completed");
                    enrollmentRepository.save(e2);

                    // Enroll Nagulapally
                    Enrollment e3 = new Enrollment();
                    e3.setUser(nagulapally);
                    e3.setCourse(courses.get(0));
                    e3.setProgress(50);
                    e3.setTimeSpentCourse(120);
                    e3.setStatus("Active");
                    enrollmentRepository.save(e3);

                    // Enroll Dhinakar
                    Enrollment e4 = new Enrollment();
                    e4.setUser(dhinakar);
                    e4.setCourse(courses.get(2));
                    e4.setProgress(20);
                    e4.setTimeSpentCourse(90);
                    e4.setStatus("Active");
                    enrollmentRepository.save(e4);
                }
                System.out.println("Default students and enrollments initialized.");
            }
        };
    }
}
