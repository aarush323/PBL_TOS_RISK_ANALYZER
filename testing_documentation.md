# PBL Week 7 (CIE) - Testing and Software Modules Documentation
## Project: TOS Risk Analyzer (Jurist AI)

---

### 1. Understanding Testing Requirements

#### (i) Functional Requirements:
- **User Management**: Account registration, secure login, and profile fetching.
- **Input Extraction**: Support for URL input, PDF file uploads, and raw text input.
- **Text Processing**: Cleaning raw text, segmenting document into legal clauses.
- **Risk Analysis**: Classifying clauses using LGBM/GRU models and NLP feature extraction.
- **Chatbot Interface**: Interactive Q&A based on the analyzed document.
- **Async Processing**: Background job execution for long-running analysis with status tracking.
- **History Management**: Reviewing past analysis results and chat histories.

#### (ii) Non-functional Requirements:
- **Security**: Secure data handling with bcrypt password hashing and JWT authentication.
- **Performance**: Efficient asynchronous processing and SSE-based real-time updates.
- **Reliability**: Robust error handling for extraction failures and model inference errors.
- **Scalability**: Organized modular architecture and database interaction using SQLAlchemy.
- **Usability**: Premium, responsive UI with animations and dark mode.

#### (iii) Expected Inputs, Processing, and Outputs:
- **Inputs**: TOS URLs (HTTP/HTTPS), PDF files, or direct text input from the user.
- **Processing**:
    1. **Extraction**: Fetching content and removing boilerplate.
    2. **NLP Filtering**: Identifying potentially risky clauses using feature vectors.
    3. **Classification**: Detailed risk analysis using ML models (LGBM/GRU/LLM).
    4. **Risk Scoring**: Computing overall risk level (Low, Medium, High).
- **Outputs**: Risk summary, categorized risky clauses, Confidence levels, and explanations.

#### (iv) Test Objectives:
- Ensure 100% accuracy in user authentication and session management.
- Validate that the extraction pipeline correctly handles various URL formats and PDF layouts.
- Verify the reliability of the async analysis job pipeline and cancellation logic.
- Confirm the chatbot provides contextually accurate answers based on the extracted text.

---

### 2. Test Planning

#### (i) Type of Testing:
- **Unit Testing**: Focusing on individual utility functions and model inference.
- **Integration Testing**: Verifying the flow between Frontend, Backend API, and Database.
- **System Testing**: End-to-end validation of the complete analysis journey.
- **User Acceptance Testing (UAT)**: Basic level testing of the UI workflow by potential users.

#### (ii) Scope and Environment:
- **Test Scope**: Extraction modules, Analysis logic, Auth system, Database CRUD, and React frontend components.
- **Test Environment**:
    - **OS**: Linux (Development), Cross-platform (Deployment)
    - **Browser**: Chrome, Firefox, Safari (Responsive testing)
    - **Backend**: Python 3.10+, FastAPI, SQLAlchemy
    - **Frontend**: React 18, Vite, TailwindCSS

#### (iii) Test Plan Strategy:
1. Initialize test database and mock environment variables.
2. Execute unit tests for backend utilities (auth, extraction).
3. Test API endpoints for correct status codes and JSON responses.
4. Verify frontend integration with the backend through manual walkthroughs.
5. Perform security scans for common vulnerabilities (SQLi, XSS).

---

### 3. Unit Testing

#### (i) Module Independence:
Each module (auth, extraction, analysis) is tested using mock data to ensure isolation.

#### (ii) Function Verification:
- `auth.security.hash_password`: Confirms passwords are correctly salted and hashed.
- `extraction.text_cleaner.clean_text`: Verifies removal of special characters and boilerplate.
- `analysis.segmenter.segment_clauses`: Ensures text is properly split into meaningful legal sections.

#### (iii) Boundary and Error Checks:
- **Input Validation**: Empty strings, invalid URLs, and non-PDF files are correctly rejected.
- **Boundary Conditions**: Handling very small and extremely large documents (>50k words).
- **Error Handling**: Verification of 404/500 status codes on database or model failure.

#### (iv) Test Results Summary:
| Module     | Tested Functionality          | Status |
|------------|-------------------------------|--------|
| Auth       | Password Hashing/JWT          | PASS   |
| Extraction | URL/PDF Parsing               | PASS   |
| Analysis   | Clause Segmentation/Inference | PASS   |

---

### 4. Integration Testing

- **Component Interaction**: Verifies the sequence of calls from frontend click to background job creation.
- **Data Flow Verification**:
    - **Frontend to Backend**: User credentials and file uploads correctly reach API endpoints.
    - **Backend to Database**: Analysis results and user sessions are persistently saved.
    - **Backend to ML Model**: Features are correctly extracted and passed to the classifier.
- **API Correctness**:
    - `/auth/login` returns valid JWT.
    - `/analyze/async` starts a uuid-based job.
    - `/chat` returns structured responses from the assistant.

---

### 5. System Testing

- **Complete Application Flow**:
    1. User registers and logs in.
    2. User provides a TOS URL.
    3. System extracts, analyzes, and provides a risk score.
    4. User asks a question about a specific clause via the chat interface.
- **Validation**:
    - **Functional Correctness**: Results match expected risk patterns.
    - **Navigation**: Seamless transitions between Login, Dashboard, and Analysis views.
    - **Performance**: Analysis completes within 10 seconds for standard documents.
- **Compatibility**: Responsive design tested on Mobile and Desktop viewports.

---

### 6. User Interface and Usability Testing

- **UI Elements**:
    - **Buttons**: Checked for active/hover states and correct redirection.
    - **Forms**: Validated for input type checking and descriptive error labels.
    - **Navigation**: Sidemenu and Auth guards work correctly.
- **Usability**:
    - Premium aesthetics using glassmorphism and smooth animations.
    - Dark mode compatibility for eye comfort.
    - Accessibility: ARIA labels and high-contrast text.
- **Error Messages**: Clear alerts for "Invalid URL", "PDF too large", or "Login failed".

---

### 7. Security and Data Validation Testing

- **Security Mechanisms**:
    - **Authentication**: JWT tokens required for protected routes (e.g., /analyses).
    - **Authorization**: Users can only access their own past analysis results.
    - **Data Sanitization**: SQLAlchemy used to prevent SQL injection.
- **Sensitive Data**: Passwords are never stored in plain text; environment variables used for API keys.

---

### 8. Bug Reporting and Re-testing

#### (i) Defects Recorded:
- **BUG-001**: SSE connection dropping on long analysis jobs.
- **BUG-002**: Extraction failing on certain complex cookie-consent banners.

#### (ii) Fixes and Re-testing:
- **FIX-001**: Implemented keep-alive ping and frontend reconnection logic.
- **FIX-002**: Enhanced BeautifulSoup filters in `url_extractor.py`.

#### (iii) Regression**:
Verified that the new extraction filters didn't break basic URL parsing.

---

### 9. Test Documentation

#### (i) Test Results Table:

| ID   | Test Case Description         | Expected Output                | Actual Output  | Status |
|------|-------------------------------|--------------------------------|----------------|--------|
| TC01 | Register with valid data      | 201 Created + Welcome msg      | As expected    | PASS   |
| TC02 | Login with incorrect password | 401 Unauthorized + Error       | As expected    | PASS   |
| TC03 | Extract text from valid URL   | JSON with cleaned text content | As expected    | PASS   |
| TC04 | Analyze risky TOS (TikTok)    | Risk Level: High               | Risk Level: High| PASS   |
| TC05 | Stop active analysis job      | 200 OK + "job cancelled"       | As expected    | PASS   |

#### (ii) Screenshots Placeholder:

> **[SCREENSHOT_01_LOGIN_SUCCESS]**
> *Description: Captured after a successful account login.*

> **[SCREENSHOT_02_URL_EXTRACTION_PROCESS]**
> *Description: Visual progress of the URL text extraction pipeline.*

> **[SCREENSHOT_03_RISK_ANALYSIS_DASHBOARD]**
> *Description: Showing the final risk breakdown and categorized clauses.*

> **[SCREENSHOT_04_CHATBOT_INTERACTION]**
> *Description: Demonstration of the AI chatbot answering domain-specific queries.*

> **[SCREENSHOT_05_MOBILE_RESPONSIVENESS]**
> *Description: App layout on a mobile screen size.*

---
**DOCUMENT GENERATED DATE**: 2026-03-26  
**STATUS**: READY FOR CIE SUBMISSION  
