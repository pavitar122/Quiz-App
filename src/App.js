import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  const [questions, setQuestions] = useState([]);
  const [remainingQuestions, setRemainingQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const correctAudioRef = useRef(null); // Only keeping correct answer sound ref

  // Process JSON data
  const processQuestions = (jsonData) => {
    return jsonData.map((item, index) => {
      let correctIndex;

      // If correctOption is a number (1-4)
      if (
        typeof item.correctOption === "number" &&
        item.correctOption >= 1 &&
        item.correctOption <= 4
      ) {
        correctIndex = item.correctOption - 1;
      }
      // If correctOption is text matching one of the options
      else if (typeof item.correctOption === "string") {
        correctIndex = item.options.findIndex(
          (opt) =>
            opt.trim().toLowerCase() === item.correctOption.trim().toLowerCase()
        );

        if (correctIndex === -1) {
          console.warn(
            `Could not find matching option for "${item.correctOption}" in question "${item.question}". Defaulting to first option.`
          );
          correctIndex = 0;
        }
      }
      // If correctIndex is already properly set (0-3)
      else if (
        typeof item.correctIndex === "number" &&
        item.correctIndex >= 0 &&
        item.correctIndex <= 3
      ) {
        correctIndex = item.correctIndex;
      }
      // Default to first option if none of the above
      else {
        console.warn(
          `Invalid correct option/index for question "${item.question}". Defaulting to first option.`
        );
        correctIndex = 0;
      }

      return {
        id: index,
        question: item.question,
        options: item.options,
        correctIndex,
      };
    });
  };

  // Function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Randomize the questions
  const randomizeQuestions = () => {
    const shuffledQuestions = shuffleArray([...remainingQuestions]);
    setRemainingQuestions(shuffledQuestions);
    if (currentQuestion && shuffledQuestions.length > 0) {
      setCurrentQuestion(shuffledQuestions[0]);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const questions = processQuestions(jsonData);
        const shuffledQuestions = shuffleArray(questions);
        setQuestions(shuffledQuestions);
        setRemainingQuestions([...shuffledQuestions]);
        setIsQuizActive(true);
        setIsQuizComplete(false);
        setScore({ correct: 0, incorrect: 0 });
        nextQuestion([...shuffledQuestions]);
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        alert("Invalid JSON file. Please upload a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Get next question from queue
  const nextQuestion = (queue) => {
    if (queue.length === 0) {
      setIsQuizComplete(true);
      setIsQuizActive(false);
      return;
    }

    setCurrentQuestion(queue[0]);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  // Handle option selection
  const handleOptionSelect = (index) => {
    if (isAnswered) return;

    setSelectedOption(index);
    const isCorrect = index === currentQuestion.correctIndex;

    // Update score
    setScore((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      incorrect: isCorrect ? prev.incorrect : prev.incorrect + 1,
    }));

    // Play sound only for correct answers
    if (isCorrect && soundEnabled && correctAudioRef.current) {
      correctAudioRef.current.currentTime = 0;
      correctAudioRef.current.play().catch((e) => console.log("Audio play failed", e));
    }

    setIsAnswered(true);

    // Update question queue
    setRemainingQuestions((prev) => {
      const newQueue = [...prev];
      newQueue.shift();

      // Re-add incorrect answers to the end
      if (!isCorrect) {
        newQueue.push(currentQuestion);
      }

      return newQueue;
    });
  };

  // Move to next question
  const handleNext = () => {
    nextQuestion(remainingQuestions);
  };

  // Restart quiz
  const restartQuiz = () => {
    const shuffledQuestions = shuffleArray([...questions]);
    setRemainingQuestions(shuffledQuestions);
    setIsQuizActive(true);
    setIsQuizComplete(false);
    setScore({ correct: 0, incorrect: 0 });
    nextQuestion([...shuffledQuestions]);
  };

  // Progress calculation
  const progress =
    questions.length > 0
      ? Math.floor(
          ((questions.length - remainingQuestions.length) / questions.length) *
            100
        )
      : 0;

  return (
    <div className="app">
      {/* Only keeping correct answer audio element */}
      <audio ref={correctAudioRef} src="/correct.mp3" preload="auto" />

      {!isQuizActive ? (
        <div className="upload-container">
          <h1>Cram MCQs in Style</h1>
          {isQuizComplete ? (
            <div className="summary">
              <h2>Quiz Completed!</h2>
              <p>Correct Answers: {score.correct}</p>
              <p>Incorrect Answers: {score.incorrect}</p>
              <button onClick={restartQuiz}>Restart Quiz</button>
            </div>
          ) : (
            <div className="file-upload">
              <label>
                Upload JSON File:
                <input type="file" accept=".json" onChange={handleFileUpload} />
              </label>
              <div className="requirements">
                <p>File must contain an array of question objects with:</p>
                <ul>
                  <li>question (string)</li>
                  <li>options (array of 4 strings)</li>
                  <li>
                    correctOption (number 1-4 or matching option text) OR
                    correctIndex (number 0-3)
                  </li>
                </ul>
                <p>Example:</p>
                <pre>
                  {`[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctOption": "4"
  },
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctIndex": 2
  }
]`}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="quiz-container">
          <div className="header">
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="score">
              <span>✓ {score.correct}</span>
              <span>✗ {score.incorrect}</span>
              <span>Total: {questions.length}</span>
              <span>Left: {remainingQuestions.length}</span>
              <button
                className="sound-toggle"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                Sound: {soundEnabled ? "ON" : "OFF"}
              </button>
              <button className="randomize-button" onClick={randomizeQuestions}>
                Shuffle
              </button>
            </div>
          </div>

          {currentQuestion && (
            <div className="question-container">
              <h2 className="question">{currentQuestion.question}</h2>
              <div className="options">
                {currentQuestion.options.map((option, index) => {
                  let className = "option";
                  if (isAnswered) {
                    if (index === currentQuestion.correctIndex) {
                      className += " correct";
                    } else if (
                      index === selectedOption &&
                      index !== currentQuestion.correctIndex
                    ) {
                      className += " wrong";
                    }
                  }

                  return (
                    <button
                      key={index}
                      className={className}
                      onClick={() => handleOptionSelect(index)}
                      disabled={isAnswered}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <button className="next-button" onClick={handleNext}>
                  {remainingQuestions.length > 1
                    ? "Next Question"
                    : "Finish Quiz"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;