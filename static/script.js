const cells = [...document.querySelectorAll(".cell")];
const modeSelect = document.getElementById("mode");
const statusText = document.getElementById("status");
const helperText = document.getElementById("helper-text");

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let scores = { X: 0, O: 0, draw: 0 };
let audioContext;

const winningLines = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];
const mode = () => modeSelect.value;

function getWinner(state) {
  for (const line of winningLines) {
    const [a,b,c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { player: state[a], line };
    }
  }
  return null;
}

function playTone(frequency = 440) {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  } catch (error) {
    // Audio is optional; gameplay does not depend on it.
  }
}

function render() {
  cells.forEach((cell, index) => {
    const value = board[index];
    cell.textContent = value === "X" ? "×" : value === "O" ? "○" : "";
    cell.classList.toggle("mark-x", value === "X");
    cell.classList.toggle("mark-o", value === "O");
    cell.disabled = Boolean(value) || gameOver;
    cell.setAttribute("aria-label", value ? `Cell ${index + 1}: ${value}` : `Empty cell ${index + 1}`);
    cell.classList.remove("winner");
  });

  const result = getWinner(board);
  if (result) result.line.forEach(index => cells[index].classList.add("winner"));

  document.getElementById("score-x").textContent = scores.X;
  document.getElementById("score-o").textContent = scores.O;
  document.getElementById("score-draw").textContent = scores.draw;
  document.getElementById("player-x").classList.toggle("active", !gameOver && currentPlayer === "X");
  document.getElementById("player-o").classList.toggle("active", !gameOver && currentPlayer === "O");
  document.getElementById("o-name").textContent = mode() === "pvp" ? "Player O" : "Computer";
  document.getElementById("o-caption").textContent = mode() === "pvp" ? "PLAYER 2" : "OPPONENT";
}

function finishRound() {
  const result = getWinner(board);
  if (result) {
    gameOver = true;
    scores[result.player]++;
    statusText.textContent = result.player === "X" ? "Player X wins!" :
      (mode() === "pvp" ? "Player O wins!" : "Computer wins!");
    helperText.textContent = "Well played. Ready for another round?";
    playTone(660);
  } else if (board.every(Boolean)) {
    gameOver = true;
    scores.draw++;
    statusText.textContent = "It's a draw!";
    helperText.textContent = "A close match. Try again!";
    playTone(300);
  } else {
    return false;
  }
  render();
  return true;
}

function availableMoves(state) {
  return state.map((value, index) => value ? null : index).filter(index => index !== null);
}

function easyMove() {
  const moves = availableMoves(board);
  return moves[Math.floor(Math.random() * moves.length)];
}

// Minimax checks all possible continuations for the strongest Hard-mode move.
function minimax(state, maximizing, depth) {
  const result = getWinner(state);
  if (result && result.player === "O") return 10 - depth;
  if (result && result.player === "X") return depth - 10;
  if (state.every(Boolean)) return 0;

  const moves = availableMoves(state);
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      state[move] = "O";
      best = Math.max(best, minimax(state, false, depth + 1));
      state[move] = "";
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    state[move] = "X";
    best = Math.min(best, minimax(state, true, depth + 1));
    state[move] = "";
  }
  return best;
}

function hardMove() {
  let bestScore = -Infinity;
  let bestMove = availableMoves(board)[0];
  for (const move of availableMoves(board)) {
    board[move] = "O";
    const score = minimax(board, false, 0);
    board[move] = "";
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function computerMove() {
  if (gameOver || currentPlayer !== "O") return;
  const move = mode() === "hard" ? hardMove() : easyMove();
  if (move === undefined) return;
  board[move] = "O";
  playTone(390);
  if (finishRound()) return;
  currentPlayer = "X";
  statusText.textContent = "Your turn — Player X";
  render();
}

function makeMove(index) {
  if (gameOver || board[index] || (mode() !== "pvp" && currentPlayer === "O")) return;
  board[index] = currentPlayer;
  playTone(currentPlayer === "X" ? 520 : 390);
  if (finishRound()) return;

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusText.textContent = currentPlayer === "X" ? "Player X's turn" :
    (mode() === "pvp" ? "Player O's turn" : "Computer is thinking…");
  render();

  if (mode() !== "pvp" && currentPlayer === "O") {
    cells.forEach(cell => cell.disabled = true);
    window.setTimeout(computerMove, 380);
  }
}

function newRound() {
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;
  statusText.textContent = "Player X's turn";
  helperText.textContent = "Take turns placing X and O.";
  render();
}

cells.forEach(cell => cell.addEventListener("click", () => makeMove(Number(cell.dataset.index))));
document.getElementById("restart").addEventListener("click", newRound);
modeSelect.addEventListener("change", () => {
  scores = { X: 0, O: 0, draw: 0 };
  newRound();
});
document.getElementById("reset-score").addEventListener("click", () => {
  scores = { X: 0, O: 0, draw: 0 };
  render();
});
document.getElementById("theme-toggle").addEventListener("click", event => {
  document.body.classList.toggle("light");
  event.currentTarget.textContent = document.body.classList.contains("light") ? "☾" : "☼";
});

render();

