// Jogo da Velha completo com modo PvP e vs CPU (Minimax).
// Estrutura principal: estado do tabuleiro, lógica de vitória, Minimax para CPU, UI e eventos.

(() => {
  // Elementos
  const boardEl = document.getElementById('board');
  const infoEl = document.getElementById('info');
  const newGameBtn = document.getElementById('newGame');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreTieEl = document.getElementById('scoreTie');
  const difficultyEl = document.getElementById('difficulty');
  const firstPlayerEl = document.getElementById('firstPlayer');
  const cellTemplate = document.getElementById('cell-template');

  // Estado do jogo
  let board = Array(9).fill(null); // indices 0..8
  let currentPlayer = 'X';
  let mode = 'pvp'; // 'pvp' ou 'cpu'
  let scores = { X: 0, O: 0, TIE: 0 };
  let gameActive = false;
  let difficulty = 'hard'; // easy | hard

  // combos vencedores
  const winLines = [
    [0,1,2],[3,4,5],[6,7,8], // linhas
    [0,3,6],[1,4,7],[2,5,8], // colunas
    [0,4,8],[2,4,6]          // diagonais
  ];

  // Inicialização
  function init() {
    // cria células
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const node = cellTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.index = i;
      node.addEventListener('click', onCellClick);
      node.addEventListener('keydown', (ev) => {
        // acessibilidade: Enter/Space joga
        if ((ev.key === 'Enter' || ev.key === ' ') && !ev.target.disabled) {
          ev.preventDefault();
          onCellClick({ target: ev.target });
        }
      });
      node.tabIndex = 0;
      boardEl.appendChild(node);
    }

    // eventos controles
    document.querySelectorAll('input[name="mode"]').forEach(r=> r.addEventListener('change', onModeChange));
    difficultyEl.addEventListener('change', () => difficulty = difficultyEl.value);
    firstPlayerEl.addEventListener('change', () => {
      // apenas atualiza a preferência; novo jogo aplicará
    });
    newGameBtn.addEventListener('click', startNewGame);

    // carregar placar se houver
    loadScores();
    startNewGame();
  }

  // quando muda o modo (pvp ou cpu)
  function onModeChange(e){
    mode = e.target.value;
    startNewGame();
  }

  // força nova partida
  function startNewGame(){
    board = Array(9).fill(null);
    gameActive = true;
    // define quem começa
    currentPlayer = firstPlayerEl.value || 'X';
    updateBoardUI();
    setInfo(`Vez de ${currentPlayer}`);
    // se modo CPU e CPU for o primeiro, CPU joga
    if (mode === 'cpu' && currentPlayer === 'O') {
      // CPU será 'O' por padrão; jogador humano será 'X' (configurável)
      setTimeout(cpuMove, 350);
    }
  }

  // evento ao clicar em célula
  function onCellClick(e){
    const idx = Number(e.target.dataset.index);
    if (!gameActive) return;
    if (board[idx]) return; // ocupada
    // marcar
    playMove(idx, currentPlayer);
  }

  // aplicar movimento
  function playMove(idx, player){
    if (!gameActive) return;
    if (board[idx]) return;
    board[idx] = player;
    updateBoardUI();

    // checar resultado
    const result = evaluate(board);
    if (result) {
      handleResult(result);
      return;
    }

    // troca de jogador
    currentPlayer = (player === 'X') ? 'O' : 'X';
    setInfo(`Vez de ${currentPlayer}`);

    // se modo CPU e agora é a vez da CPU, que joga automaticamente
    if (mode === 'cpu' && currentPlayer === 'O') {
      // atraso para parecer humano
      setTimeout(cpuMove, 250);
    }
  }

  // atualização visual do tabuleiro
  function updateBoardUI() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      const idx = Number(cell.dataset.index);
      cell.classList.remove('x','o','winner');
      cell.disabled = !!board[idx] || !gameActive;
      cell.setAttribute('aria-pressed', !!board[idx]);
      if (board[idx]) {
        const mark = board[idx];
        cell.textContent = mark;
        cell.classList.add(mark.toLowerCase());
      } else {
        cell.textContent = '';
      }
    });
  }

  // define texto de informação
  function setInfo(text){
    infoEl.textContent = text;
  }

  // checa vitória ou empate
  // retorna: {winner:'X'|'O'|'TIE', line:[..]} ou null
  function evaluate(s) {
    // vitória
    for (const line of winLines) {
      const [a,b,c] = line;
      if (s[a] && s[a] === s[b] && s[a] === s[c]) {
        return { winner: s[a], line };
      }
    }
    // empate
    if (s.every(Boolean)) {
      return { winner: 'TIE' };
    }
    return null;
  }

  // lida com resultado
  function handleResult(res){
    gameActive = false;
    if (res.winner === 'TIE') {
      setInfo('Empate!');
      scores.TIE++;
      highlightTie();
    } else {
      setInfo(`${res.winner} venceu!`);
      highlightWinningLine(res.line);
      scores[res.winner]++;
    }
    saveScores();
    updateScoresUI();
    // desabilita células
    boardEl.querySelectorAll('.cell').forEach(c => c.disabled = true);
  }

  // destaca linha vencedora
  function highlightWinningLine(line) {
    if (!line) return;
    line.forEach(i => {
      const cell = boardEl.querySelector(`.cell[data-index="${i}"]`);
      if (cell) cell.classList.add('winner');
    });
  }

  function highlightTie(){
    boardEl.querySelectorAll('.cell').forEach(c => {
      c.classList.add('winner');
    });
  }

  // placar
  function updateScoresUI(){
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreTieEl.textContent = scores.TIE;
  }

  function saveScores(){
    try {
      localStorage.setItem('ttt_scores', JSON.stringify(scores));
    } catch(e){}
  }

  function loadScores(){
    try {
      const v = JSON.parse(localStorage.getItem('ttt_scores') || 'null');
      if (v && typeof v === 'object') scores = Object.assign(scores, v);
    } catch(e){}
    updateScoresUI();
  }

  // CPU move: usa minimax (se difficult='hard') ou aleatório (easy)
  function cpuMove(){
    if (!gameActive) return;
    if (difficulty === 'easy') {
      const avail = board.map((v,i)=>v?null:i).filter(n=>n!==null);
      const choice = avail[Math.floor(Math.random()*avail.length)];
      playMove(choice, 'O');
      return;
    }

    // hard => minimax: CPU joga como 'O'
    const best = minimax(board.slice(), 'O');
    playMove(best.index, 'O');
  }

  // Minimax implementation
  // retorna {index:..., score:...}
  function minimax(state, player) {
    const huPlayer = 'X';
    const aiPlayer = 'O';

    // avaliar posição
    const res = evaluate(state);
    if (res) {
      if (res.winner === aiPlayer) return {score: 10};
      if (res.winner === huPlayer) return {score: -10};
      return {score: 0};
    }

    const availIndices = state.map((v,i)=>v?null:i).filter(n=>n!==null);

    const moves = [];

    for (const idx of availIndices) {
      const move = {};
      move.index = idx;
      state[idx] = player;

      const nextPlayer = (player === aiPlayer) ? huPlayer : aiPlayer;
      const result = minimax(state, nextPlayer);
      move.score = result.score;

      // reset
      state[idx] = null;
      moves.push(move);
    }

    // escolher melhor movimento
    let bestMove;
    if (player === aiPlayer) {
      // maximizar
      let bestScore = -Infinity;
      for (const m of moves) {
        if (m.score > bestScore) { bestScore = m.score; bestMove = m; }
      }
    } else {
      // minimizar
      let bestScore = +Infinity;
      for (const m of moves) {
        if (m.score < bestScore) { bestScore = m.score; bestMove = m; }
      }
    }

    return bestMove;
  }

  // vincular atalho teclado: N = novo jogo, R = reset placar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N') startNewGame();
    if (e.key === 'r' || e.key === 'R') {
      scores = { X:0, O:0, TIE:0 };
      saveScores(); updateScoresUI(); setInfo('Placar zerado');
    }
  });

  // inicializa UI de placar
  updateScoresUI();

  // inicia tudo
  init();

  // export para debug (opcional)
  window._ttt = {
    getBoard: () => board.slice(),
    restart: startNewGame,
    play: (i, p) => playMove(i,p)
  };

})();
