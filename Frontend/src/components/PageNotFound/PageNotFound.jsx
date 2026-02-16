import React from "react";
import { useNavigate } from "react-router-dom";
import pageNotFoundImg from "../../assets/pagenotfound.jpg";
import "./PageNotFound.css";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="page-not-found-container">
      <div className="page-not-found-content">
        <img
          src={pageNotFoundImg}
          alt="Page not found"
          className="page-not-found-image"
        />
        <h1 className="page-not-found-title">404 - Page Not Found</h1>
        <p className="page-not-found-message">
          The page you are looking for does not exist or the URL is invalid.
        </p>
        <button
          type="button"
          className="page-not-found-btn"
          onClick={() => navigate("/")}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default PageNotFound;
