import React, { useEffect } from "react";
import { FiArrowRight, FiAward, FiBookOpen, FiCheckCircle, FiUsers, FiMapPin, FiMail, FiPhone } from "react-icons/fi";
import { HiOutlineAcademicCap } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import landingHero from "../../assets/LangingPage.jpg.jpeg";
import mainCollegeImg from "../../assets/mainCollegeImg.jpg";
import huLogo from "../../assets/HUNAV.jpg.jpeg";
import "./Layout.css";

const featureCards = [
  {
    icon: <FiUsers />,
    title: "Student Management",
    text: "Complete lifecycle management from admission to alumni.",
  },
  {
    icon: <FiBookOpen />,
    title: "Academic Planning",
    text: "Course scheduling and curriculum management.",
  },
  {
    icon: <FiAward />,
    title: "Examination & Results",
    text: "Secure exams with automated evaluation.",
  },
];

const aboutCards = [
  {
    icon: <FiUsers />,
    title: "Role-Based Architecture",
    text: "Secure access aligned with defined user roles.",
  },
  {
    icon: <FiBookOpen />,
    title: "Centralized Information",
    text: "Single source of reliable institutional data.",
  },
  {
    icon: <FiAward />,
    title: "Transparency",
    text: "Real-time insights for informed decisions.",
  },
  {
    icon: <HiOutlineAcademicCap />,
    title: "Scalability",
    text: "Flexible design that grows with institutions.",
  },
];

const Layout = () => {
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);

  const handleGetStarted = () => {
    // Check if user has any role data in Redux state
    // The data structure is userData.user.role based on the API response
    if (userData && userData.user && userData.user.role) {
      // User has logged in before, navigate to their role-specific dashboard
      if (userData.user.role === "faculty") {
        navigate("/faculty/faculty-dashboard");
      } else if (userData.user.role === "student") {
        navigate("/dashboard");
      } else if (userData.user.role === "admin") {
        navigate("/admin/dashboard");
      }
    } else {
      // User hasn't logged in with any role, go to login page
      navigate("/login");
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <img src={huLogo} alt="Haridwar University" className="landing-nav-logo" />
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <button type="button" className="landing-signin-btn" onClick={() => navigate("/login")}>
            Sign In
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-media" style={{ backgroundImage: `url(${landingHero})` }} />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <h1>
            Manage Your University <span>With Excellence</span>
          </h1>
          <p>
            A comprehensive ERP solution designed for modern education. Streamline
            administration, enhance learning, and empower your campus community.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="btn-primary" onClick={handleGetStarted}>
              Get Started
              <FiArrowRight />
            </button>
            <a className="btn-secondary" href="#about">
              Learn More
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <span className="section-tag">FEATURES</span>
        <h2>Everything you need to run your campus</h2>
        <div className="feature-grid">
          {featureCards.map((item) => (
            <article key={item.title} className="feature-card">
              <div className="feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="landing-section about-section">
        <span className="section-tag">ABOUT THE SYSTEM</span>
        <h2>ERP Management System for Modern Education</h2>
        <p className="about-intro">
          A comprehensive ERP solution designed for modern education.
          Streamline administration, enhance learning, and empower your campus community.
        </p>

        <div className="about-content">
          <div className="about-left">
            <img src={mainCollegeImg} alt="Campus" className="about-image" />
            <ul>
              <li>
                <FiCheckCircle />
                A unified digital platform that replaces fragmented and manual
                institutional processes.
              </li>
              <li>
                <FiCheckCircle />
                Automates workflows and centralizes data to improve efficiency,
                accuracy, and transparency.
              </li>
              <li>
                <FiCheckCircle />
                Built on role-based access to enable secure collaboration among all
                stakeholders.
              </li>
            </ul>
          </div>
          <div className="about-grid">
            {aboutCards.map((item) => (
              <article key={item.title} className="about-card">
                <div className="feature-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div>
          <strong>16+</strong>
          <span>Years of Educational Experience</span>
        </div>
        <div>
          <strong>50+</strong>
          <span>Multidisciplinary Programs</span>
        </div>
        <div>
          <strong>200+</strong>
          <span>Companies Visited For Placement</span>
        </div>
        <div>
          <strong>5K+</strong>
          <span>Glorious Alumni</span>
        </div>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src={huLogo} alt="Haridwar University" className="footer-logo" />
            <p className="footer-tagline">
              Empowering the future generation through excellence in education and
              technology.
            </p>
            <div className="footer-social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="footer-social-link">f</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="footer-social-link">𝕏</a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-social-link">in</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="footer-social-link">Li</a>
            </div>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <a href="/login"><span className="footer-link-arrow">›</span> Student Login</a>
            <a href="/login"><span className="footer-link-arrow">›</span> Faculty Login</a>
            <a href="/login"><span className="footer-link-arrow">›</span> Admin Portal</a>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <div className="footer-contact-item">
              <FiMapPin className="footer-contact-icon" />
              <span>Haridwar, Uttarakhand</span>
            </div>
            <div className="footer-contact-item">
              <FiMail className="footer-contact-icon" />
              <span>info@haridwaruniversity.edu</span>
            </div>
            <div className="footer-contact-item">
              <FiPhone className="footer-contact-icon" />
              <span>+91 123 456 7890</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">© 2026 Haridwar University. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
