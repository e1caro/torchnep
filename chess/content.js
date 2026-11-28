/* Lessons and openings. Step kinds: info, collect, square, move, quiz. */
var EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
var COURSE = [
  {
    rank: 2, name: 'Meet the pieces', blurb: 'The board and how each piece moves.',
    lessons: [
      {
        id: 'board', name: 'The board', icon: 'p', steps: [
          { t: 'info', fen: Chess.START, text: 'A chessboard has 64 squares. The columns are *files*, lettered a to h. The rows are *ranks*, numbered 1 to 8. White starts on ranks 1 and 2, Black on 7 and 8.' },
          { t: 'info', fen: EMPTY, marks: ['e4'], text: 'Every square has a name: its file letter, then its rank number. The marked square is *e4*. Players use these names to write down moves.' },
          { t: 'square', targets: ['e4', 'a1', 'h8', 'd5', 'g2'], text: 'Your turn. Click the square' },
          { t: 'quiz', fen: Chess.START, q: 'Set the board so each player has a light square in the right-hand corner. For White, which corner is that?', options: ['a1', 'h1'], answer: 1, why: 'h1 is light. "Light on right" is how you check a board is set up the right way round.' }
        ]
      },
      {
        id: 'rook', name: 'The rook', icon: 'r', steps: [
          { t: 'info', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']], text: 'The *rook* moves in straight lines: any number of squares along a file or a rank. It cannot jump over other pieces.' },
          { t: 'collect', piece: 'R', at: 'a1', stars: ['a5', 'e5', 'e2'], par: 3, text: 'Collect every star with the rook. Three moves is perfect.' }
        ]
      },
      {
        id: 'bishop', name: 'The bishop', icon: 'b', steps: [
          { t: 'info', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', arrows: [['d4', 'a1'], ['d4', 'h8'], ['d4', 'a7'], ['d4', 'g1']], text: 'The *bishop* moves diagonally, as far as it likes. It never leaves the colour it starts on, so each side has a light-squared and a dark-squared bishop.' },
          { t: 'collect', piece: 'B', at: 'c1', stars: ['f4', 'd6', 'a3'], par: 3, text: 'Collect the stars with the bishop. Diagonals only.' }
        ]
      },
      {
        id: 'queen', name: 'The queen', icon: 'q', steps: [
          { t: 'info', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4'], ['d4', 'a1'], ['d4', 'h8'], ['d4', 'a7'], ['d4', 'g1']], text: 'The *queen* is a rook and a bishop in one: straight lines and diagonals. She is the strongest piece on the board.' },
          { t: 'collect', piece: 'Q', at: 'd1', stars: ['d5', 'h5', 'e8', 'a4'], par: 4, text: 'Four stars, four queen moves. Mix straight lines and diagonals.' }
        ]
      },
      {
        id: 'knight', name: 'The knight', icon: 'n', steps: [
          { t: 'info', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', marks: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'], text: 'The *knight* moves in an L: two squares one way, then one square to the side. It is the only piece that jumps over others, and it always lands on the opposite colour.' },
          { t: 'collect', piece: 'N', at: 'b1', stars: ['c3', 'e4', 'f6', 'h5'], blocks: { a2: 'P', b2: 'P', c2: 'P', d2: 'P' }, par: 4, text: 'Hop over your own pawns and collect the stars in four jumps.' }
        ]
      },
      {
        id: 'king', name: 'The king', icon: 'k', steps: [
          { t: 'info', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', marks: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'], text: 'The *king* moves one square in any direction. He is slow, but the whole game is about him: lose the king and you lose the game.' },
          { t: 'collect', piece: 'K', at: 'e1', stars: ['e2', 'f3', 'g4'], par: 3, text: 'Walk the king to each star, one step at a time.' },
          { t: 'quiz', fen: '4r3/8/8/8/8/8/8/3K4 w - - 0 1', arrows: [['e8', 'e1']], q: 'The black rook controls the whole e-file. Can the white king step to e1 or e2?', options: ['Yes, kings go anywhere', 'No, a king may never move onto an attacked square'], answer: 1, why: 'A king can never walk into an attack. That one rule shapes every endgame.' }
        ]
      },
      {
        id: 'pawn', name: 'The pawn', icon: 'p', steps: [
          { t: 'move', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', text: 'Pawns move straight ahead, one square at a time. From its starting square a pawn may jump two. Jump the pawn to *e4*.', accept: ['e4'], alt: { e3: 'Legal, and sometimes right. Here, try the two-square jump.' }, done: 'Pawns never move backwards, so every pawn move is a commitment.' },
          { t: 'move', fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1', text: 'Pawns are the only pieces that capture differently from how they move: one square *diagonally* forward. Capture a black pawn.', accept: ['exd5', 'exf5'], alt: { e5: 'That is a normal move. Capture diagonally instead.' }, done: 'Forward to move, diagonal to capture.' },
          { t: 'quiz', fen: '8/8/8/4p3/4P3/8/8/8 w - - 0 1', q: 'A black pawn stands directly in front of yours. Can your pawn move?', options: ['Yes, it captures the pawn in front', 'No, it is blocked'], answer: 1, why: 'Pawns cannot capture straight ahead. Two pawns face to face are stuck until something changes.' }
        ]
      }
    ]
  },
  {
    rank: 3, name: 'Rules of the game', blurb: 'Check, mate, draws and the special moves.',
    lessons: [
      {
        id: 'check', name: 'Check', icon: 'k', steps: [
          { t: 'info', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8']], text: 'A king under attack is in *check*. You must answer a check at once, and there are only three ways: *move* the king, *block* the line, or *capture* the attacker.' },
          { t: 'move', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', text: 'Give check with your rook.', goal: 'check', done: 'Check! In notation a check is written with a plus sign: Ra8+.' },
          { t: 'move', fen: '4r1k1/8/8/8/8/8/8/4K3 w - - 0 1', text: 'Your king is in check from the rook. *Move* him out of the line of fire.', goal: 'any', done: 'Safe. Stepping aside is the simplest answer to a check.' },
          { t: 'move', fen: '4r1k1/8/8/8/8/8/3P1P2/3QKB2 w - - 0 1', text: 'Check again, and this time the king has nowhere to go. *Block* the check by putting a piece in the way.', goal: 'any', done: 'Blocked. Only checks from rooks, bishops and queens can be blocked. A knight check cannot.' },
          { t: 'move', fen: '4r1k1/8/8/1B6/8/8/3P1P2/3QK3 w - - 0 1', text: 'Best of all: *capture* the piece that gives check.', accept: ['Bxe8'], alt: { Qe2: 'That blocks, but the rook is free to take.', Be2: 'That blocks, but the rook is free to take.' }, done: 'The attacker is gone, and you won a rook.' }
        ]
      },
      {
        id: 'mate', name: 'Checkmate', icon: 'q', steps: [
          { t: 'info', fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', arrows: [['d8', 'g8']], text: '*Checkmate* ends the game. The king is in check and none of the three escapes works: he cannot move, nothing can block, nothing can capture. Here Black is checkmated.' },
          { t: 'move', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', text: 'Deliver checkmate in one move.', mateIn: 1, done: 'Checkmate. The king is trapped behind his own pawns.' },
          { t: 'move', fen: '7k/8/5K2/6Q1/8/8/8/8 w - - 0 1', text: 'Your king guards the squares the queen needs. Find the checkmate.', mateIn: 1, done: 'The queen cannot be taken because your king protects her.' }
        ]
      },
      {
        id: 'stalemate', name: 'Stalemate', icon: 'k', steps: [
          { t: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', q: 'Black to move. The black king is not in check, but every square around him is attacked. What is the result?', options: ['Checkmate, White wins', 'Stalemate, a draw', 'Black passes the turn'], answer: 1, why: 'No legal move and no check is *stalemate*: the game is drawn at once. A huge advantage can vanish this way.' },
          { t: 'move', fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', text: 'You are winning easily. Finish the game, and do not stalemate.', mateIn: 1, alt: { Qf7: 'Stalemate! Black has no legal move and is not in check, so the game is a draw.' }, done: 'Checkmate. Before every move in a won endgame, ask: does the enemy king still have a move?' }
        ]
      },
      {
        id: 'castle', name: 'Castling', icon: 'r', steps: [
          { t: 'info', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', arrows: [['e1', 'g1'], ['h1', 'f1']], text: '*Castling* is the only move that moves two pieces. The king slides two squares toward a rook and the rook hops over him. It tucks the king away and brings the rook into play.' },
          { t: 'move', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: 'Castle kingside: move the king two squares to the right.', accept: ['O-O'], done: 'Written O-O. The king is safe behind three pawns.' },
          { t: 'move', fen: 'r3kbnr/ppp1pppp/2nq4/3p1b2/3P1B2/2NQ4/PPP1PPPP/R3KBNR w KQkq - 6 5', text: 'Now castle on the queenside, the long way.', accept: ['O-O-O'], done: 'Written O-O-O. The rook lands on the open centre file.' },
          { t: 'quiz', fen: '5rk1/8/8/8/8/8/PPPPP1PP/RNBQK2R w KQ - 0 1', arrows: [['f8', 'f1']], q: 'The black rook attacks f1. Can White castle kingside right now?', options: ['Yes', 'No, the king would pass through an attacked square'], answer: 1, why: 'You cannot castle out of check, through check or into check. The king and that rook must also never have moved, with empty squares between them.' }
        ]
      },
      {
        id: 'enpassant', name: 'En passant', icon: 'p', steps: [
          { t: 'info', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', arrows: [['d7', 'd5']], text: 'A special pawn rule. If an enemy pawn uses its two-square jump to land right beside your pawn, you may capture it *as if it had moved only one square*. This is called *en passant*, "in passing".' },
          { t: 'move', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', text: 'Black just played the pawn from d7 to d5. Capture it en passant.', accept: ['exd6'], done: 'Your pawn lands on d6 and the black pawn disappears. The chance lasts one move only.' }
        ]
      },
      {
        id: 'promotion', name: 'Promotion', icon: 'q', steps: [
          { t: 'move', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', text: 'A pawn that reaches the far end becomes a queen, rook, bishop or knight. Push the pawn and choose a *queen*.', accept: ['e8=Q'], alt: { 'e8=R': 'A rook works, but take the queen.', 'e8=B': 'Take the queen.', 'e8=N+': 'Take the queen this time.' }, done: 'A new queen. This is why an extra pawn often decides a game.' },
          { t: 'move', fen: '8/2q1P1k1/8/8/8/8/8/4K3 w - - 0 1', text: 'A queen is not always best. Promote to the piece that attacks the king and the queen at once.', accept: ['e8=N+'], alt: { 'e8=Q': 'Good, but a knight gives check and attacks the queen too.' }, done: 'Choosing a lesser piece is called *underpromotion*. The knight wins the queen next move.' }
        ]
      }
    ]
  },
  {
    rank: 4, name: 'First principles', blurb: 'What pieces are worth and how to start a game.',
    lessons: [
      {
        id: 'values', name: 'Piece values', icon: 'r', steps: [
          { t: 'info', fen: Chess.START, text: 'Players count material in pawns. *Pawn 1, knight 3, bishop 3, rook 5, queen 9.* The king has no price. Use the numbers to judge a trade.' },
          { t: 'quiz', q: 'You can swap your rook for an enemy bishop. Good deal?', options: ['Yes', 'No'], answer: 1, why: 'A rook is worth 5 and a bishop 3. Giving a rook for a minor piece is called losing the exchange.' },
          { t: 'quiz', q: 'Which is worth the most?', options: ['A queen', 'A rook and a bishop', 'Two knights and a pawn'], answer: 0, why: 'Queen 9. Rook and bishop 8. Two knights and a pawn 7.' }
        ]
      },
      {
        id: 'count', name: 'Count before you capture', icon: 'n', steps: [
          { t: 'move', fen: '4k3/8/4p3/1b1n4/8/2N5/8/4K3 w - - 0 1', text: 'Your knight can capture two pieces. One is defended, one is not. Take the free one.', accept: ['Nxb5'], alt: { Nxd5: 'The e6 pawn takes back: an even trade. The bishop was free.' }, done: 'An undefended piece is called *hanging*. Look for them on every move, yours and theirs.' },
          { t: 'quiz', fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1b2P3/2P2N2/PP1P1PPP/RNBQKB1R w KQkq - 0 1', arrows: [['c3', 'b4']], q: 'Your pawn attacks a bishop that a knight defends. Should you capture?', options: ['Yes', 'No, it is defended'], answer: 0, why: 'You win a bishop (3) and lose only a pawn (1). A defended piece can still be a bargain for a cheaper attacker.' }
        ]
      },
      {
        id: 'principles', name: 'Opening principles', icon: 'b', steps: [
          { t: 'info', fen: Chess.START, marks: ['d4', 'e4', 'd5', 'e5'], text: 'Three rules start almost every good game. *Control the centre* with a pawn. *Develop* your knights and bishops. *Castle* early to protect the king.' },
          { t: 'move', fen: Chess.START, text: 'Play a pawn into the centre.', accept: ['e4', 'd4'], done: 'A centre pawn takes space and opens lines for the bishop and queen.' },
          { t: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', text: 'Now develop a knight toward the centre.', accept: ['Nf3', 'Nc3'], alt: { Qh5: 'Bringing the queen out early lets Black develop while chasing her.' }, done: 'Knights belong near the centre, where they reach the most squares.' },
          { t: 'quiz', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', q: 'Both sides have a knight out. What is the best plan now?', options: ['Bring out a bishop, then castle', 'Push the a-pawn and h-pawn', 'Move the same knight again'], answer: 0, why: 'Get every piece working before you attack, and do not move one piece twice without a reason.' }
        ]
      }
    ]
  },
  {
    rank: 5, name: 'Tactics', blurb: 'The tricks that win material.',
    lessons: [
      {
        id: 'fork', name: 'The fork', icon: 'n', steps: [
          { t: 'info', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [['c7', 'e8'], ['c7', 'a8']], text: 'A *fork* is one piece attacking two targets at once. Your opponent can save only one. Knights are the best forkers because nothing can block them.' },
          { t: 'move', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', text: 'Fork the king and the rook.', accept: ['Nc7+'], done: 'The king must move out of check, then you take the rook.' },
          { t: 'move', fen: '4k3/5q2/8/1N6/8/8/8/4K3 w - - 0 1', text: 'Find the fork that wins the queen.', accept: ['Nd6+'], alt: { 'Nc7+': 'Check, but nothing else is attacked. Look for the square that hits both.' }, done: 'King and queen forked: the family fork.' },
          { t: 'move', fen: '4k3/8/8/2n1n3/8/3P4/8/7K w - - 0 1', text: 'Even a pawn can fork. Attack both knights.', accept: ['d4'], done: 'One knight will fall. The cheaper the forking piece, the better the deal.' }
        ]
      },
      {
        id: 'pin', name: 'The pin', icon: 'b', steps: [
          { t: 'info', fen: '4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1', arrows: [['b5', 'e8']], text: 'A *pin* freezes a piece because moving it would expose something more valuable behind it. This knight is pinned to its king, so it is not allowed to move at all.' },
          { t: 'move', fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', text: 'Pin the knight to the king.', accept: ['Bb5'], done: 'Pinned. Only bishops, rooks and queens can pin.' },
          { t: 'move', fen: '4k3/1p6/2n5/1B6/3P4/8/8/4K3 w - - 0 1', text: 'The pinned knight is defended, so taking it is only a trade. Attack it again with something cheap.', accept: ['d5'], alt: { 'Bxc6+': 'The b7 pawn recaptures: an even trade. The knight cannot run, so attack it with the pawn.' }, done: 'A pinned piece cannot run away. Pile up on it.' }
        ]
      },
      {
        id: 'skewer', name: 'The skewer', icon: 'r', steps: [
          { t: 'info', fen: '4q3/8/8/4k3/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8']], text: 'A *skewer* is a pin turned around: the more valuable piece stands in front. When it moves away, you capture what was hiding behind it.' },
          { t: 'move', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', text: 'Skewer the king and queen.', accept: ['Re1+'], alt: { 'Ra5+': 'Check, but the queen is not on that line.' }, done: 'The king must step off the file, and the queen is yours.' }
        ]
      },
      {
        id: 'discovered', name: 'Discovered attack', icon: 'b', steps: [
          { t: 'info', fen: '4k3/8/8/8/4B3/7q/8/4R1K1 w - - 0 1', arrows: [['e1', 'e8']], text: 'Move one piece out of the way and the piece *behind* it attacks. The piece that moved gets a free turn to make its own threat. Here the bishop hides a rook check.' },
          { t: 'move', fen: '4k3/8/8/8/4B3/7q/8/4R1K1 w - - 0 1', text: 'Move the bishop so the rook gives check, and attack the queen with the bishop at the same time.', accept: ['Bf5+', 'Bg2+'], done: 'Black must deal with the check, so the queen is lost. Discovered checks are the strongest tactic there is.' }
        ]
      }
    ]
  },
  {
    rank: 6, name: 'Checkmate patterns', blurb: 'Mates worth knowing by heart.',
    lessons: [
      {
        id: 'backrank', name: 'Back-rank mate', icon: 'r', steps: [
          { t: 'move', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', text: 'A castled king behind three unmoved pawns has no way out. Mate him on the back rank.', mateIn: 1, done: 'The most common checkmate in club chess.' },
          { t: 'move', fen: '3r2k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1', text: 'A rook guards the back rank, but you have two. Mate in two moves.', mateIn: 2, done: 'One rook gives itself up, the second delivers mate.' },
          { t: 'move', fen: 'r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', text: 'Now you are the one in danger: Black threatens Ra1 mate. Give your king an escape square with a pawn move.', accept: ['h3', 'g3', 'h4', 'g4', 'f3', 'f4'], alt: { Kh1: 'Ra1 is still checkmate.', Kf1: 'That works, but the usual cure is a quiet pawn move.' }, done: 'Players call this making *luft*, German for air.' }
        ]
      },
      {
        id: 'ladder', name: 'The ladder mate', icon: 'r', steps: [
          { t: 'info', fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1', arrows: [['a7', 'h7']], text: 'Two rooks mate a lone king without help. One rook fences the king in along a rank. The other checks on the next rank. Then they swap, like climbing a ladder.' },
          { t: 'move', fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1', text: 'The seventh rank is fenced off. Deliver mate on the eighth.', mateIn: 1, done: 'The top rung.' },
          { t: 'move', fen: '8/6k1/R7/8/8/8/8/1R4K1 w - - 0 1', text: 'One rung lower. Climb the ladder: mate in two.', mateIn: 2, done: 'Check with the back rook, then the other one finishes.' }
        ]
      },
      {
        id: 'queenmate', name: 'Queen and king', icon: 'q', steps: [
          { t: 'move', fen: '6k1/Q7/6K1/8/8/8/8/8 w - - 0 1', text: 'Queen and king beat a lone king every time. The king is on the edge and your king stands guard. Finish it.', mateIn: 1, done: 'The queen right in front of the king, protected by yours, is the kiss of death.' },
          { t: 'move', fen: '7k/8/5K2/8/8/8/8/Q7 w - - 0 1', text: 'Mate in two. Your own king is in the queen\'s way.', mateIn: 2, done: 'Stepping aside opened the long diagonal with check.' }
        ]
      },
      {
        id: 'scholar', name: "Scholar's mate", icon: 'q', steps: [
          { t: 'info', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', arrows: [['h5', 'f7'], ['c4', 'f7']], text: 'The pawn on f7 is guarded only by the king. Queen and bishop both aim at it. This four-move trap catches every beginner once.' },
          { t: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', text: 'Black just played a natural knight move and missed the threat. Punish it.', mateIn: 1, done: 'The king cannot take the queen because the bishop protects her.' },
          { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', text: 'Now you play Black. Stop the mate on f7.', accept: ['g6', 'Qe7', 'Qf6'], alt: { Nf6: 'Qxf7 is checkmate.' }, done: 'Defended. Afterwards White\'s queen is simply misplaced, and you gain time by chasing her.' }
        ]
      },
      {
        id: 'smothered', name: 'Smothered mate', icon: 'n', steps: [
          { t: 'move', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', text: 'The black king is walled in by his own pieces. Only one piece can reach him.', mateIn: 1, done: 'A *smothered mate*: the king has no air and a knight check cannot be blocked.' },
          { t: 'move', fen: '5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1', text: 'One of the most beautiful ideas in chess. Mate in two, starting with a queen sacrifice.', mateIn: 2, done: 'The rook is forced to bury its own king. This is Philidor\'s legacy, known for over 200 years.' }
        ]
      }
    ]
  },
  {
    rank: 7, name: 'Endgame essentials', blurb: 'Turn one extra pawn into a queen.',
    lessons: [
      {
        id: 'square', name: 'Rule of the square', icon: 'p', steps: [
          { t: 'info', fen: '8/8/8/P7/8/8/8/7K w - - 0 1', marks: ['a5', 'b5', 'c5', 'd5', 'a6', 'b6', 'c6', 'd6', 'a7', 'b7', 'c7', 'd7', 'a8', 'b8', 'c8', 'd8'], text: 'Can a lone king catch a running pawn? Draw a square from the pawn to the promotion rank. If the defending king can step *inside the square*, he catches the pawn. No counting needed.' },
          { t: 'quiz', fen: '8/8/8/P7/4k3/8/8/7K b - - 0 1', marks: ['a5', 'b5', 'c5', 'd5', 'a6', 'b6', 'c6', 'd6', 'a7', 'b7', 'c7', 'd7', 'a8', 'b8', 'c8', 'd8'], q: 'Black to move. Does the king catch the pawn?', options: ['Yes', 'No'], answer: 0, why: 'The king steps to d5, inside the square, and arrives on a8 just in time.' },
          { t: 'quiz', fen: '8/8/8/P7/5k2/8/8/7K b - - 0 1', marks: ['a5', 'b5', 'c5', 'd5', 'a6', 'b6', 'c6', 'd6', 'a7', 'b7', 'c7', 'd7', 'a8', 'b8', 'c8', 'd8'], q: 'The king starts one file further away. Black to move. Does he catch it now?', options: ['Yes', 'No'], answer: 1, why: 'He cannot enter the square in one move, so the pawn queens.' }
        ]
      },
      {
        id: 'opposition', name: 'The opposition', icon: 'k', steps: [
          { t: 'info', fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1', arrows: [['e6', 'e8']], text: 'Two kings facing each other with one square between them are in *opposition*. Whoever has to move must give way. Here Black must step aside, and the white king escorts the pawn home.' },
          { t: 'move', fen: '4k3/8/3K4/4P3/8/8/8/8 w - - 0 1', text: 'One move wins, the natural pawn push only draws. Take the opposition.', accept: ['Ke6'], alt: { e6: 'Now Kd8, and after e7+ Ke8 you must give up the pawn or stalemate. A draw.' }, done: 'Black has to step aside, your king goes to the seventh rank, and the pawn walks in. King first, pawn second.' }
        ]
      }
    ]
  }
];

/* side = the colour you play in the drill */
var OPENINGS = [
  {
    id: 'italian', name: 'Italian Game', side: 'w', idea: 'Fast development and a bishop aimed at f7.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
    notes: ['Take the centre and open lines for the queen and bishop.', 'Black claims an equal share of the centre.', 'Develop with a threat: the knight attacks e5.', 'Black defends the pawn and develops.', 'The Italian bishop eyes f7, the weakest point in Black\'s camp.', 'Black mirrors, aiming at f2.', 'Prepares d4 and gives the bishop a retreat.', 'Develops and attacks e4.', 'Solid support for e4. The slow, modern Italian.', 'Black shores up e5 and frees the bishop.', 'King to safety.', 'Both sides are developed and castled. The real game starts here.']
  },
  {
    id: 'ruy', name: 'Ruy Lopez', side: 'w', idea: 'Pressure on the knight that defends e5.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
    notes: ['Centre first.', 'Black answers in kind.', 'Attack e5.', 'Defend e5.', 'The Spanish bishop pressures the defender of e5.', 'Black asks the bishop a question.', 'Keep the pressure. Taking the knight gives up the bishop pair.', 'Counterattack on e4.', 'Castle. The e4 pawn is protected by tactics.', 'Black blocks the e-file and prepares to castle.', 'Now e4 is truly defended.', 'Black finally pushes the bishop away.', 'The bishop lands on a fine diagonal toward f7.', 'Supports e5 and opens the bishop.', 'Prepares d4 and a retreat square on c2.', 'The main line of the Closed Ruy Lopez, played for 150 years.']
  },
  {
    id: 'qgd', name: "Queen's Gambit", side: 'w', idea: 'Offer a wing pawn to win the centre.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3'],
    notes: ['The queen\'s pawn opening: the pawn is already protected.', 'Black holds the centre.', 'The gambit. If Black takes, White gets a big centre and wins the pawn back.', 'Declined. Black keeps a firm pawn on d5.', 'More pressure on d5.', 'A defender arrives.', 'Pin the knight that guards d5.', 'Black breaks the pin.', 'Opens the way for the light-squared bishop.', 'King safety.', 'Every white piece has a good square. A classical setup.']
  },
  {
    id: 'london', name: 'London System', side: 'w', idea: 'One sturdy setup against almost anything.',
    moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
    notes: ['Queen\'s pawn.', 'Black matches it.', 'The London bishop comes out before e3 locks it in.', 'Natural development.', 'A solid pawn chain forms.', 'Black challenges the centre.', 'The pyramid: c3, d4, e3.', 'More pressure on d4.', 'The knight heads for f3 without blocking the c-pawn.', 'Black frees the dark-squared bishop.', 'Both knights developed.', 'Black offers a bishop trade.', 'Decline politely. If Black takes, the h-file opens for your rook.', 'Black castles.', 'The London setup is complete. Castle next.']
  },
  {
    id: 'sicilian', name: 'Sicilian Defence', side: 'b', idea: 'Fight for the centre from the side and play for a win.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    notes: ['White takes the centre.', 'The Sicilian. Black controls d4 with a wing pawn.', 'White prepares d4.', 'Guards e5 and opens the bishop.', 'White opens the centre.', 'Black trades a wing pawn for a centre pawn.', 'Knight to a dominant square.', 'Develops with an attack on e4.', 'Defends e4.', 'The Najdorf: keeps pieces out of b5 and prepares queenside expansion.']
  },
  {
    id: 'french', name: 'French Defence', side: 'b', idea: 'A solid pawn chain, then hit the base of White\'s centre.',
    moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6'],
    notes: ['King\'s pawn.', 'Quiet, but it prepares d5.', 'White builds a full centre.', 'Black challenges e4 at once.', 'The Advance: White grabs space and locks the centre.', 'Attack the base of the pawn chain.', 'White supports d4.', 'A second attacker on d4.', 'A second defender.', 'A third attacker, and the queen also eyes b2.']
  },
  {
    id: 'caro', name: 'Caro-Kann', side: 'b', idea: 'Support d5 without shutting in the bishop.',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
    notes: ['King\'s pawn.', 'Prepares d5 with the c-pawn.', 'Full centre.', 'The challenge arrives.', 'White defends e4.', 'Black releases the tension.', 'The knight recaptures in the centre.', 'The point of the opening: the bishop gets out before e6.', 'The knight attacks the bishop.', 'A safe home, where the bishop still watches the long diagonal.']
  },
  {
    id: 'kid', name: "King's Indian", side: 'b', idea: 'Let White build a centre, then strike back at it.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
    notes: ['Queen\'s pawn.', 'Stops e4 for the moment.', 'White takes space.', 'Black prepares to put the bishop on the long diagonal.', 'Supports e4.', 'The bishop on g7 is the soul of this opening.', 'White owns the centre.', 'Guards e5 and opens the other bishop.', 'Development.', 'The king is safe before the fight begins.', 'Calm development.', 'The counterstrike. Black finally challenges the centre.']
  }
];

/* ---- second wave: more lessons per rank, and a test that closes each rank ---- */
var MORE = {
  4: [
    {
      id: 'threat', name: 'Answering a threat', icon: 'n', steps: [
        { t: 'info', fen: '4k3/8/8/4p3/3N4/8/8/4K3 w - - 0 1', arrows: [['e5', 'd4']], text: 'When one of your pieces is attacked you have the same three answers as with a check: *move* it, *defend* it, or *capture* the attacker. Look at the cheapest answer first.' },
        { t: 'move', fen: '4k3/8/8/4p3/3N4/8/8/4K3 w - - 0 1', text: 'A pawn attacks your knight. A knight is worth three pawns, so defending it is not enough. Move it to safety.', accept: ['Nb3', 'Nb5', 'Nc2', 'Nc6', 'Ne2', 'Ne6', 'Nf3', 'Nf5'], done: 'When a cheaper piece attacks a more valuable one, moving away is usually the only answer.' },
        { t: 'move', fen: '4k3/8/8/2b5/3N4/8/8/2R1K3 w - - 0 1', text: 'The bishop attacks your knight. Before you run, look at the attacker: is it defended?', accept: ['Rxc5'], done: 'The best answer to a threat is to take the piece that makes it.' },
        { t: 'quiz', q: 'Your bishop is attacked by an enemy bishop, and a pawn already defends yours. What now?', options: ['It must move at once', 'Nothing is needed: a trade of bishops would be even'], answer: 1, why: 'Equal pieces attacking each other is only an offer to trade. You must react when the attacker is cheaper than your piece, or when your piece has no defender.' }
      ]
    },
    {
      id: 'trade', name: 'When to trade', icon: 'r', steps: [
        { t: 'info', fen: Chess.START, text: 'A trade swaps pieces of equal value. The count stays the same, yet a trade is rarely neutral. Strong players follow one rule: *when you are ahead, trade pieces. When you are behind, keep them on.*' },
        { t: 'quiz', q: 'You are a rook up. Your opponent offers to trade queens. Accept?', options: ['Yes', 'No'], answer: 0, why: 'With the queens off, nothing can surprise you and the extra rook decides. Every trade makes an extra piece count for more.' },
        { t: 'quiz', q: 'You are a knight down. You can trade your last rook for theirs. Accept?', options: ['Yes', 'No'], answer: 1, why: 'Each trade brings your opponent closer to a simple won endgame. When behind, keep pieces on and make the game complicated.' }
      ]
    }
  ],
  5: [
    {
      id: 'double', name: 'Double attack', icon: 'q', steps: [
        { t: 'info', fen: '4k3/8/8/8/Qb6/8/8/6K1 b - - 0 1', arrows: [['a4', 'e8'], ['a4', 'b4']], text: 'A fork by the queen is called a *double attack*: check, and a loose piece hit on the same move. A piece that nothing defends is called loose, and loose pieces drop off.' },
        { t: 'move', fen: '4k3/8/8/8/1b6/8/8/3Q2K1 w - - 0 1', text: 'The bishop on b4 has no defender. Give check and attack it with one queen move.', accept: ['Qa4+'], alt: { 'Qe1+': 'That hits both, but the bishop simply takes your queen.' }, done: 'Black must answer the check, and the bishop falls.' }
      ]
    },
    {
      id: 'defender', name: 'Remove the defender', icon: 'b', steps: [
        { t: 'info', fen: '3q1rk1/5ppp/5n2/6BQ/8/3B3P/2P2PP1/6K1 w - - 0 1', arrows: [['h5', 'h7'], ['d3', 'h7'], ['f6', 'h7']], text: 'Queen and bishop both aim at h7, and only the knight on f6 guards it. When one piece holds a position together, *remove the defender*: capture it, chase it away or pin it.' },
        { t: 'move', fen: '3q1rk1/5ppp/5n2/6BQ/8/3B3P/2P2PP1/6K1 w - - 0 1', text: 'Take away the guard of h7.', accept: ['Bxf6'], alt: { 'Qxh7+': 'The knight takes your queen. Deal with the knight first.' }, then: [['Qxf6', 1], ['gxf6', 1]], done: 'If Black recaptures, Qxh7 is checkmate. If Black does anything else, you take the queen.' }
      ]
    }
  ],
  6: [
    {
      id: 'arabian', name: 'Rook and knight', icon: 'n', steps: [
        { t: 'move', fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', text: 'A knight two squares diagonally from the corner takes away the king\'s exits and guards the rook\'s landing square. Deliver the mate.', mateIn: 1, done: 'The *Arabian mate*, one of the oldest patterns on record. The knight covers g8 and protects the rook.' },
        { t: 'move', fen: '7k/8/5N2/1p6/8/8/R7/6K1 w - - 0 1', text: 'Same pattern, one move earlier. Mate in two.', mateIn: 2, done: 'Bring the rook to the right rank or file first. The king has nowhere to go while you do it.' }
      ]
    },
    {
      id: 'legal', name: 'Opening mates', icon: 'k', steps: [
        { t: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', text: 'You play Black. White has pushed the f-pawn and g-pawn and opened the diagonal to the king. Punish it.', mateIn: 1, done: '*Fool\'s mate*, the shortest game possible. Moving the pawns in front of your king costs more than it looks.' },
        { t: 'move', fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6', text: 'Black just took your queen with the bishop. It was bait. Mate in two.', mateIn: 2, done: '*Légal\'s mate*. Three minor pieces deliver mate while Black\'s bishop sits on your queen\'s square.' }
      ]
    }
  ],
  7: [
    {
      id: 'rookmate', name: 'King and rook', icon: 'r', steps: [
        { t: 'info', fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', arrows: [['a1', 'a8']], text: 'A rook needs its king to give mate. The picture is always the same: the kings face each other, the enemy king is on the edge, and the rook checks along that edge.' },
        { t: 'move', fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', text: 'The kings face each other. Finish it.', mateIn: 1, done: 'Your king covers the three squares in front, the rook covers the edge.' },
        { t: 'move', fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', text: 'Not lined up yet. Mate in two: set up the picture first.', mateIn: 2, done: 'Set up the picture, then check on the edge. Every king and rook ending finishes this way.' }
      ]
    },
    {
      id: 'passed', name: 'Passed pawns', icon: 'p', steps: [
        { t: 'info', fen: '6k1/5ppp/8/P7/8/8/5PPP/6K1 w - - 0 1', marks: ['a5'], text: 'A *passed pawn* has no enemy pawn in front of it or on the files beside it. Only pieces can stop it, so it must be watched all game. Most endgames are about making one and pushing it.' },
        { t: 'quiz', fen: '6k1/5ppp/8/P7/8/8/5PPP/R5K1 w - - 0 1', arrows: [['a1', 'a5']], q: 'Where does a rook belong when you have a passed pawn?', options: ['In front of the pawn, leading it', 'Behind the pawn, pushing it'], answer: 1, why: 'Behind the pawn, the rook gains room with every step. In front, it gets in the way. Rooks belong behind passed pawns, yours and theirs.' },
        { t: 'quiz', fen: '8/5pk1/6p1/8/P7/6P1/5PK1/8 w - - 0 1', marks: ['a4'], q: 'Pawns are equal, but White has a passed pawn far from the kings. What is it good for?', options: ['It is a decoy: the black king must leave to stop it', 'Nothing, it will be lost'], answer: 0, why: 'While the black king walks over to catch the a-pawn, the white king eats the pawns on the other side. An *outside passed pawn* usually wins a pawn ending.' }
      ]
    }
  ]
};
/* pz = a puzzle drawn at random from the generated set, by kind and rating */
var EXAMS = {
  2: [
    { t: 'move', fen: '8/8/8/8/4p3/8/3N4/8 w - - 0 1', text: 'Capture the pawn with the knight.', accept: ['Nxe4'] },
    { t: 'move', fen: '8/8/5r2/8/8/2B5/8/8 w - - 0 1', text: 'Capture the rook with the bishop.', accept: ['Bxf6'] },
    { t: 'move', fen: '8/8/8/8/8/3n4/4P3/8 w - - 0 1', text: 'Capture the knight with the pawn.', accept: ['exd3'] },
    { t: 'move', fen: '8/8/8/8/1R4b1/8/8/8 w - - 0 1', text: 'Capture the bishop with the rook.', accept: ['Rxg4'] },
    { t: 'move', fen: '8/8/8/5n2/8/8/2Q5/8 w - - 0 1', text: 'Capture the knight with the queen.', accept: ['Qxf5'] }
  ],
  3: [
    { t: 'pz', k: 'm1', hi: 800 },
    { t: 'move', fen: 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5', text: 'Make your king safe in one move.', accept: ['O-O'] },
    { t: 'move', fen: '4k3/8/8/8/1b6/P7/8/4K3 w - - 0 1', text: 'You are in check. Capture the checking piece.', accept: ['axb4'] },
    { t: 'move', fen: '4k3/8/8/2Pp4/8/8/8/4K3 w - d6 0 1', text: 'Black just played the pawn from d7 to d5. Take it en passant.', accept: ['cxd6'] },
    { t: 'pz', k: 'm1', hi: 800 }
  ],
  4: [
    { t: 'move', fen: '4k3/8/1p6/2n1b3/8/3N4/8/4K3 w - - 0 1', text: 'Two captures. Take the piece that costs you nothing.', accept: ['Nxe5'] },
    { t: 'pz', k: 'win', hi: 1000 },
    { t: 'pz', k: 'win', hi: 1000 },
    { t: 'pz', k: 'win', hi: 1000 }
  ],
  5: [
    { t: 'move', fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1', text: 'Fork the king and the rook.', accept: ['Nd6+'] },
    { t: 'pz', k: 'win', lo: 900 },
    { t: 'pz', k: 'win', lo: 900 },
    { t: 'pz', k: 'win', lo: 900 },
    { t: 'pz', k: 'm1', lo: 780 }
  ],
  6: [
    { t: 'pz', k: 'm1', lo: 800 },
    { t: 'pz', k: 'm1', lo: 800 },
    { t: 'pz', k: 'm2' },
    { t: 'pz', k: 'm2' },
    { t: 'pz', k: 'm2' }
  ],
  7: [
    { t: 'move', fen: '3k4/8/2K5/3P4/8/8/8/8 w - - 0 1', text: 'One move wins, the pawn push only draws.', accept: ['Kd6'] },
    { t: 'move', fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1', text: 'King and rook. Mate in two.', mateIn: 2 },
    { t: 'pz', k: 'm2', lo: 1150 },
    { t: 'pz', k: 'm2', lo: 1150 },
    { t: 'pz', k: 'm2', lo: 1150 }
  ]
};
/* ---- third wave: eight more lessons ---- */
var MORE2 = {
  2: [
    {
      id: 'capture', name: 'Capturing', icon: 'r', steps: [
        { t: 'info', fen: '8/8/8/8/R3n3/8/8/8 w - - 0 1', arrows: [['a4', 'e4']], text: 'To *capture*, move onto a square that holds an enemy piece. That piece leaves the board and yours takes its place. Capturing is never compulsory.' },
        { t: 'move', fen: '8/8/8/8/R3n3/8/8/8 w - - 0 1', text: 'Capture the knight with the rook.', accept: ['Rxe4'], done: 'In notation a capture is written with an x: Rxe4.' },
        { t: 'quiz', fen: '8/8/8/8/R1P1n3/8/8/8 w - - 0 1', q: 'Now your own pawn stands between the rook and the knight. Can the rook still capture?', options: ['Yes', 'No'], answer: 1, why: 'Only the knight jumps. Every other piece is stopped by whatever stands in its way, friend or enemy.' },
        { t: 'move', fen: '8/8/3r4/8/8/6B1/8/8 w - - 0 1', text: 'Capture the rook with the bishop.', accept: ['Bxd6'], done: 'A bishop for a rook is a good deal. More about that on rank 4.' }
      ]
    }
  ],
  3: [
    {
      id: 'draws', name: 'Draws', icon: 'k', steps: [
        { t: 'info', fen: '8/8/8/4k3/8/4K3/8/8 w - - 0 1', text: 'Not every game has a winner. Besides stalemate, a game is drawn when neither side has enough pieces to mate, when the same position occurs three times, when fifty moves pass without a capture or a pawn move, or when both players agree.' },
        { t: 'quiz', fen: '8/8/8/4k3/8/4KB2/8/8 w - - 0 1', q: 'King and bishop against a lone king. Can White ever give checkmate?', options: ['Yes, with patience', 'No, it is a draw'], answer: 1, why: 'A single bishop or a single knight cannot mate. The game is drawn at once for lack of material.' },
        { t: 'quiz', q: 'You are losing badly, but you can check the enemy king back and forth for ever. What happens?', options: ['The checks must stop after three', 'The position repeats three times and the game is drawn'], answer: 1, why: 'This is *perpetual check*, the most common way to save a lost game. Always look for it when you are behind.' },
        { t: 'quiz', q: 'Your opponent has only a king. You have a king and a rook. After fifty moves you still have not mated. Result?', options: ['You win on material', 'Draw by the fifty-move rule'], answer: 1, why: 'Fifty moves by each side without a capture or a pawn move is a draw. This is why the basic mates are worth knowing by heart.' }
      ]
    },
    {
      id: 'notation', name: 'Reading moves', icon: 'b', steps: [
        { t: 'info', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', arrows: [['g1', 'f3']], text: 'Moves are written as a piece letter and the square it goes to: *K* king, *Q* queen, *R* rook, *B* bishop, *N* knight. Pawns get no letter. The arrow shows Nf3: knight to f3.' },
        { t: 'quiz', q: 'What does Bxc6+ mean?', options: ['Bishop takes on c6, with check', 'Bishop moves to c6 and is captured', 'A pawn takes the bishop on c6'], answer: 0, why: 'x means takes, + means check, # means checkmate. O-O is castling short and O-O-O castling long.' },
        { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', text: 'Play the move written Bb5.', accept: ['Bb5'], done: 'That is the Ruy Lopez, one of the oldest openings. You will meet it under Openings.' },
        { t: 'quiz', q: 'Two knights can both jump to d2. How is the move of the knight from b1 written?', options: ['Nd2', 'Nbd2', 'Nd2b'], answer: 1, why: 'When two identical pieces can reach the same square, the starting file is added: Nbd2.' }
      ]
    }
  ],
  4: [
    {
      id: 'kingsafety', name: 'King safety', icon: 'k', steps: [
        { t: 'info', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 1', marks: ['e1'], text: 'Files open first in the centre, so a king left there is a target. Castling puts him behind a wall of pawns. Black has done it. White has not.' },
        { t: 'move', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 1', text: 'Every minor piece is out. What does the position ask for?', accept: ['O-O'], alt: { Bg5: 'A good move, but the king comes first. Castle, then pin.' }, done: 'Castle before you attack. Many beginner games are lost by a king stuck in the centre.' },
        { t: 'quiz', fen: '6k1/5p1p/6p1/8/8/8/5PPP/6K1 w - - 0 1', q: 'After castling, which pawns should you avoid pushing without a good reason?', options: ['The three in front of your king', 'The ones on the other wing'], answer: 0, why: 'Every pawn move in front of the king leaves a hole that never closes. One small step for luft is fine. A pawn storm in front of your own king is not.' }
      ]
    }
  ],
  5: [
    {
      id: 'trapped', name: 'The trapped piece', icon: 'b', steps: [
        { t: 'info', fen: '4k3/8/8/8/8/1P6/b1P5/2K5 b - - 0 1', marks: ['a2'], text: 'A piece with no safe square is *trapped*, and a trapped piece is usually lost. Bishops and knights that wander into the enemy camp for a pawn are the usual victims.' },
        { t: 'move', fen: '4k3/8/8/8/8/8/bPP5/2K5 w - - 0 1', text: 'The bishop has just taken a pawn on a2. Shut the door behind it.', accept: ['b3'], alt: { Kd2: 'The bishop escapes through b1 or b3. Close the diagonal first.' }, done: 'The bishop cannot get out, and your king walks to b2 to collect it.' },
        { t: 'quiz', q: 'Before you grab a pawn deep in enemy territory, what should you check first?', options: ['That your piece has a way back out', 'That the pawn stands on a dark square'], answer: 0, why: 'Count the exits before you go in. A pawn is not worth a piece.' }
      ]
    },
    {
      id: 'battery', name: 'The battery', icon: 'q', steps: [
        { t: 'info', fen: '5rk1/5ppp/8/8/8/3Q4/2B2PPP/6K1 w - - 0 1', arrows: [['c2', 'h7']], text: 'Two pieces lined up on the same file or diagonal form a *battery*. The one in front strikes, the one behind protects it. Queen and bishop aimed at h7 is the most dangerous battery in chess.' },
        { t: 'move', fen: '5rk1/5ppp/8/8/8/3Q4/2B2PPP/6K1 w - - 0 1', text: 'Fire the battery.', mateIn: 1, done: 'The king cannot take the queen: the bishop stands behind her.' },
        { t: 'move', fen: '3r2k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', text: 'Rooks make batteries too. Two on one file beat one.', mateIn: 1, done: 'Doubled rooks: the second one makes the first untouchable.' }
      ]
    }
  ],
  6: [
    {
      id: 'pictures', name: 'Three classic mates', icon: 'q', steps: [
        { t: 'move', fen: '3rkr2/8/8/8/8/7Q/8/6K1 w - - 0 1', text: 'The king\'s own rooks stand on his shoulders like epaulettes. Mate him.', mateIn: 1, done: 'The *epaulette mate*: his own pieces take his flight squares.' },
        { t: 'move', fen: '8/4N1pk/8/8/8/8/6K1/R7 w - - 0 1', text: 'The knight covers two squares and a pawn blocks a third. One check on the open file ends it.', mateIn: 1, done: '*Anastasia\'s mate*: knight and rook against a king on the edge.' },
        { t: 'move', fen: '2kr4/p2n4/2p5/8/5B2/8/4B3/6K1 w - - 0 1', text: 'Two bishops on crossing diagonals. Find the mate.', mateIn: 1, done: '*Boden\'s mate*: the bishops criss-cross and the king\'s own pieces do the rest.' }
      ]
    }
  ],
  7: [
    {
      id: 'kingactive', name: 'The king joins in', icon: 'k', steps: [
        { t: 'info', fen: '8/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', arrows: [['g1', 'f1'], ['f1', 'e2'], ['e2', 'd3']], text: 'With the queens gone, nothing can mate the king any more, and he becomes a strong piece worth about four pawns. In the endgame the king walks to the centre.' },
        { t: 'quiz', fen: '8/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', q: 'A pure pawn ending has just begun. What is the first thing to do?', options: ['Push the pawns as fast as possible', 'Bring the king toward the centre'], answer: 1, why: 'The side whose king arrives first usually wins the pawns. King first, pawns second.' },
        { t: 'move', fen: '7k/8/8/8/8/1p6/8/2K5 w - - 0 1', text: 'The black pawn is two steps from queening and its king is far away. Deal with it.', accept: ['Kb2'], alt: { Kb1: 'That stops it too, but attacking the pawn at once wins it.' }, done: 'The king attacks the pawn and takes it next move. A king is the best piece for stopping pawns.' }
      ]
    }
  ]
};
/* ---- fourth wave: seven more lessons ---- */
var MORE3 = {
  2: [
    {
      id: 'setup', name: 'Setting up', icon: 'q', steps: [
        { t: 'info', fen: Chess.START, marks: ['d1', 'd8'], text: 'Rooks go in the corners, knights beside them, then the bishops. *The queen goes on her own colour*: the white queen on a light square, the black queen on a dark one. The king takes the square that is left, and the pawns fill the rank in front.' },
        { t: 'quiz', fen: Chess.START, q: 'On which square does the white queen start?', options: ['d1', 'e1'], answer: 0, why: 'd1 is a light square, and the white queen starts on her own colour. The two queens face each other on the d-file.' },
        { t: 'quiz', fen: Chess.START, q: 'Which piece stands next to each rook at the start?', options: ['A knight', 'A bishop'], answer: 0, why: 'Rook, knight, bishop from each corner inward.' },
        { t: 'quiz', q: 'Who makes the first move of the game?', options: ['White, always', 'Black, always', 'Whoever wins a coin toss'], answer: 0, why: 'White moves first and the players then take turns. You may never pass.' }
      ]
    }
  ],
  3: [
    {
      id: 'ismate', name: 'Mate or not?', icon: 'k', steps: [
        { t: 'quiz', fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', status: 'checkmate', arrows: [['d8', 'g8']], q: 'Black is in check. Go through the three escapes: move, block, capture. Is it checkmate?', options: ['Checkmate', 'Not mate'], answer: 0, why: 'No flight square, nothing can block on e8 or f8, nothing attacks the rook.' },
        { t: 'quiz', fen: '3R2k1/5pp1/7p/8/8/8/8/6K1 b - - 0 1', status: 'check', arrows: [['d8', 'g8']], q: 'One pawn has moved. Is it checkmate now?', options: ['Checkmate', 'Not mate'], answer: 1, why: 'The king steps to h7. One pawn move made all the difference.' },
        { t: 'quiz', fen: 'r2R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', status: 'check', arrows: [['d8', 'g8']], q: 'The pawns are back, but Black has a rook on a8. Checkmate?', options: ['Checkmate', 'Not mate'], answer: 1, why: 'The rook on a8 captures the attacker. Always check all three escapes.' },
        { t: 'quiz', fen: '6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1', status: 'checkmate', q: 'The queen gives check from the square right in front of the king. Checkmate?', options: ['Checkmate', 'Not mate'], answer: 0, why: 'The king cannot take the queen because the white king protects her.' },
        { t: 'quiz', fen: '6k1/6Q1/8/8/8/8/8/6K1 b - - 0 1', status: 'check', q: 'The same check, but the white king is far away. Checkmate?', options: ['Checkmate', 'Not mate'], answer: 1, why: 'Nothing protects the queen, so the king simply takes her. A piece that gives check next to the king needs a guard.' }
      ]
    }
  ],
  4: [
    {
      id: 'tempo', name: 'Winning time', icon: 'n', steps: [
        { t: 'info', fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', arrows: [['b1', 'c3']], text: 'A move is also called a *tempo*. You win one when you develop a piece and attack something at the same time: your opponent has to spend a move answering instead of developing.' },
        { t: 'move', fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', text: 'The black queen has come out early. Develop a piece and attack her.', accept: ['Nc3'], done: 'She must move again, and you are a move ahead in development.' },
        { t: 'quiz', q: 'In the opening, how often should one piece move, as a rule?', options: ['Once, until the others are out', 'As often as it finds a nicer square'], answer: 0, why: 'Every second move by the same piece is a move the others did not get. Bring out all of them first.' }
      ]
    },
    {
      id: 'counting', name: 'Attackers and defenders', icon: 'r', steps: [
        { t: 'info', fen: '3r2k1/5ppp/5n2/3p4/8/2N3P1/5PBP/3R2K1 w - - 0 1', arrows: [['d1', 'd5'], ['c3', 'd5'], ['g2', 'd5']], text: 'To win a defended piece you need *more attackers than it has defenders*. Count them: three white pieces attack the pawn on d5, and two black pieces defend it.' },
        { t: 'move', fen: '3r2k1/5ppp/5n2/3p4/8/2N3P1/5PBP/3R2K1 w - - 0 1', text: 'Three against two. Win the pawn, and begin with a minor piece.', accept: ['Nxd5', 'Bxd5'], alt: { Rxd5: 'It works out here, but never lead with your most valuable attacker. Begin with a minor piece.' }, done: 'After all the captures you are a pawn up. Begin with the cheapest attacker and keep the most valuable for last.' },
        { t: 'quiz', q: 'A pawn is attacked twice and defended twice. Can you win it?', options: ['Yes', 'No'], answer: 1, why: 'With equal numbers the last capture belongs to the defender. You need one more attacker than there are defenders.' }
      ]
    }
  ],
  5: [
    {
      id: 'overload', name: 'The overloaded piece', icon: 'r', steps: [
        { t: 'info', fen: '3r2k1/5ppp/3b4/8/8/8/5PPP/3RR1K1 w - - 0 1', arrows: [['d8', 'd6'], ['d8', 'e8']], text: 'A piece with two jobs is *overloaded*. The black rook guards the bishop on d6 and also the back rank. It cannot do both.' },
        { t: 'move', fen: '3r2k1/5ppp/3b4/8/8/8/5PPP/3RR1K1 w - - 0 1', text: 'Make the rook choose between its two jobs.', accept: ['Rxd6'], then: [['Rxd6', 1]], done: 'If the rook takes back it leaves the back rank, and Re8 is checkmate. If it stays, you have won a bishop.' }
      ]
    }
  ],
  6: [
    {
      id: 'support', name: 'Queen with a helper', icon: 'q', steps: [
        { t: 'info', fen: '6k1/5pp1/7p/8/8/6Q1/1B3PPP/6K1 w - - 0 1', arrows: [['b2', 'g7'], ['g3', 'g7']], text: 'Most checkmates are a queen landing next to the king on a square that another piece protects. Learn to see the helper first: a bishop on the long diagonal, a knight on g5, a pawn on f6.' },
        { t: 'move', fen: '6k1/5pp1/7p/8/8/6Q1/1B3PPP/6K1 w - - 0 1', text: 'The bishop looks down the long diagonal. Finish it.', mateIn: 1, done: 'Queen takes on g7, guarded from the far corner of the board.' },
        { t: 'move', fen: '5rk1/5pp1/8/6NQ/8/8/5PPP/6K1 w - - 0 1', text: 'The h-pawn is gone and a knight stands on g5. Mate in one.', mateIn: 1, done: 'Queen and knight against h7: the reason castled players think twice before letting a knight reach g5.' }
      ]
    }
  ],
  7: [
    {
      id: 'rules7', name: 'Endgame rules of thumb', icon: 'r', steps: [
        { t: 'quiz', fen: '6k1/1R3ppp/8/8/8/8/5PPP/6K1 w - - 0 1', arrows: [['b7', 'f7']], q: 'Where is a rook strongest in the endgame?', options: ['On its own back rank, guarding', 'On the seventh rank, attacking pawns from the side'], answer: 1, why: 'On the seventh rank the rook attacks the pawns that have not moved and cuts the king off on the back rank.' },
        { t: 'quiz', q: 'Each side has a bishop, one on light squares and one on dark. You are a pawn up. What should you expect?', options: ['An easy win', 'A likely draw'], answer: 1, why: 'Bishops of opposite colours never meet, so the defender can blockade on squares your bishop cannot touch. These endings are famous for being drawn.' },
        { t: 'quiz', q: 'You are a pawn up in a rook ending. Which trade helps you most?', options: ['Pawns', 'Pieces'], answer: 1, why: 'Trade pieces when ahead, pawns when behind. With the rooks off, the extra pawn usually wins a king and pawn ending.' }
      ]
    }
  ]
};
COURSE.forEach(function (u) {
  u.lessons = u.lessons.concat(MORE[u.rank] || [], MORE2[u.rank] || [], MORE3[u.rank] || [], [{ id: 'exam' + u.rank, name: 'Rank ' + u.rank + ' test', icon: 'k', exam: true, steps: EXAMS[u.rank] }]);
});

/* ---- openings: every opening is a small tree of named lines ---- */
var MAINLINE = {
  italian: ['Giuoco Pianissimo', 'The slow, modern Italian: build first, attack later.'],
  ruy: ['Closed Variation', 'The main road: a long manoeuvring game.'],
  qgd: ['Declined: Orthodox', 'Black holds d5 with e6. Develop and pin.'],
  london: ['Main setup', 'The pyramid c3, d4, e3 with the bishop outside.'],
  sicilian: ['Open: Najdorf', 'The sharpest and most played Sicilian.'],
  french: ['Advance Variation', 'White locks the centre. Attack its base.'],
  caro: ['Classical Variation', 'Trade on e4 and bring the bishop out.'],
  kid: ['Classical Variation', 'White takes the centre, you strike with e5.']
};
var VARIATIONS = {
  italian: [
    { n: 'Centre Attack', idea: 'Strike with d4 at once and open the game.', m: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5', t: { 8: 'The sharp choice: hit the centre before Black is ready.', 9: 'Black has to take.', 10: 'A full pawn centre, with tempo on the bishop.', 11: 'The check is the point. Retreating would lose the centre fight.', 12: 'Block and offer a trade.', 13: 'Black swaps the bishops.', 14: 'Recapture with the b-knight, so the other knight keeps guarding d4.', 15: 'The freeing break. Without it White\'s centre would roll forward.', 16: 'Open the e-file.', 17: 'Level material. You have an isolated pawn and active pieces.' } },
    { n: 'Evans Gambit', idea: 'Give a wing pawn to build the centre with tempo.', m: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O', t: { 6: 'A pawn offered to drag the bishop off its diagonal.', 7: 'Taking is the principled reply.', 8: 'Tempo on the bishop, and d4 is prepared.', 9: 'The usual retreat, keeping an eye on c3.', 10: 'The centre arrives.', 11: 'Black grabs a second pawn.', 12: 'Castle and attack. Your lead in development is worth the pawns.' } },
    { n: 'Two Knights: Fried Liver', idea: 'Punish the natural recapture on d5 with a knight sacrifice.', m: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3', t: { 5: 'The Two Knights Defence: Black counterattacks e4.', 6: 'Two attackers on f7 already.', 7: 'The only good way to block the bishop.', 8: 'Take.', 9: 'Natural, and a mistake. Na5 was correct.', 10: 'The Fried Liver sacrifice: the king is dragged out.', 11: 'Forced.', 12: 'Check, and the pinned knight on d5 is attacked twice.', 13: 'The king must walk forward to hold the knight.', 14: 'A third attacker on d5. Black\'s king is stuck in the middle of the board.' } },
    { n: 'Two Knights: main defence', idea: 'What to do when Black knows the right move.', m: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5', t: { 9: 'The right move: Black hits your bishop instead of retaking.', 10: 'Check before retreating.', 11: 'Black gives a pawn for time.', 12: 'Take it.', 13: 'Black has open lines for the pawn.', 14: 'The safe retreat.', 15: 'The knight is chased.', 16: 'Back home.', 17: 'Black gains space with tempo.', 18: 'A strong central post. You are a pawn up, Black has the activity.' } }
  ],
  ruy: [
    { n: 'Berlin Defence', idea: 'Black heads for a queenless endgame. Know the route.', m: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', t: { 5: 'The Berlin: Black attacks e4 at once.', 6: 'Castle and let the pawn go. It comes back.', 7: 'Black takes.', 8: 'Open the centre while the knight is loose.', 9: 'The knight retreats with an attack on your bishop.', 10: 'Trade, damaging the pawns.', 11: 'Recapturing this way opens the queen\'s file.', 12: 'The pawn is regained.', 13: 'The knight finds its square.', 14: 'Queens off.', 15: 'The Berlin endgame. Black cannot castle but has the bishop pair.' } },
    { n: 'Exchange Variation', idea: 'Double Black\'s pawns and aim for the endgame.', m: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1', t: { 6: 'Give up the bishop to wreck the pawns.', 7: 'Away from the centre for once: it opens lines for the bishops.', 8: 'Castle. Now e5 really is threatened.', 9: 'Solid protection for e5.', 10: 'Open the position.', 11: 'Black trades.', 12: 'A fine central knight.', 13: 'Black chases it.', 14: 'Retreat, eyeing c5.', 15: 'Black trades queens.', 16: 'Your four pawns against three on the kingside can make a passed pawn. Black\'s doubled pawns cannot.' } },
    { n: 'Open Variation', idea: 'Black takes e4. Win the pawn back with a grip on the centre.', m: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6', t: { 9: 'The Open Ruy: Black grabs the pawn.', 10: 'Open the e-file while the knight is loose.', 11: 'Black drives the bishop back first.', 12: 'Still aiming at f7 and d5.', 13: 'Black supports the knight.', 14: 'The pawn is back.', 15: 'Black defends d5. You have the e5 wedge, Black has the active knight.' } }
  ],
  qgd: [
    { n: 'Declined: Exchange', idea: 'Fix the pawns and play on the queenside.', m: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Qc2', t: { 6: 'Clarify the centre at once.', 7: 'Black keeps a pawn on d5.', 8: 'The pin again.', 9: 'Unpin.', 10: 'Solid.', 11: 'Castles.', 12: 'The best diagonal: straight at h7.', 13: 'Development.', 14: 'Queen and bishop line up. Next comes the minority attack with b4 and b5.' } },
    { n: 'Accepted', idea: 'Black takes the pawn. Get it back calmly.', m: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6', t: { 3: 'Accepted. Black cannot keep the pawn.', 4: 'Stops e5 and develops.', 5: 'Development.', 6: 'Opens the bishop onto c4.', 7: 'Black gets ready for c5.', 8: 'The pawn is back, with a lead in development.', 9: 'Black challenges d4.', 10: 'Castle.', 11: 'Black prepares b5. A balanced, open game.' } },
    { n: 'Accepted: the b5 trap', idea: 'What happens when Black tries to keep the pawn.', m: 'd4 d5 c4 dxc4 e3 b5 a4 c6 axb5 cxb5 Qf3', t: { 4: 'Opens the bishop on c4 at once.', 5: 'Greedy: Black tries to keep the pawn.', 6: 'Undermine the chain.', 7: 'Supports b5, but opens the long diagonal.', 8: 'Trade.', 9: 'Now the trap closes.', 10: 'The rook on a8 is attacked and cannot be saved without losing a piece.' } },
    { n: 'Slav Defence', idea: 'Black supports d5 with the c-pawn and keeps the bishop free.', m: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O', t: { 3: 'The Slav: d5 is supported and the c8 bishop stays free.', 4: 'Development.', 5: 'Development.', 6: 'More pressure on d5.', 7: 'Now Black takes, with b5 ready.', 8: 'Stops b5, so the pawn can be regained.', 9: 'The bishop gets out before e6.', 10: 'Opens the bishop.', 11: 'Solid.', 12: 'Material is level again.', 13: 'A pin, to fight for e4.', 14: 'Castle. You have the centre, Black is solid.' } }
  ],
  london: [
    { n: 'Black plays Qb6', idea: 'The one early problem: your b2 pawn.', m: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 Qb6 Qb3 c4 Qc2', t: { 9: 'The annoying move: b2 is attacked because the bishop left c1.', 10: 'Meet queen with queen.', 11: 'Black gains space and hits the queen.', 12: 'Step aside. The c4 push took the pressure off d4, and e4 is coming.' } },
    { n: 'Against a fianchetto', idea: 'The same setup works against the King\'s Indian.', m: 'd4 Nf6 Bf4 g6 Nf3 Bg7 e3 O-O Be2 d6 h3 Nbd7 O-O', t: { 1: 'Black keeps options open.', 2: 'The London bishop anyway.', 3: 'A fianchetto is coming.', 4: 'Development.', 5: 'The bishop takes the long diagonal.', 6: 'The usual pawn chain.', 7: 'Castles.', 8: 'A modest square, safe from the g7 bishop.', 9: 'Black prepares e5.', 10: 'A home on h2 for the bishop when e5 or Nh5 comes.', 11: 'Supports e5.', 12: 'Castle. Solid and hard to crack.' } },
    { n: 'Jobava London', idea: 'A knight on c3 adds a quick threat on c7.', m: 'd4 d5 Bf4 Nf6 Nc3 e6 Nb5 Na6 e3 Be7 Nf3 O-O', t: { 4: 'The Jobava twist: the knight comes out in front of the c-pawn.', 5: 'Solid.', 6: 'Threatens Nxc7+, forking king and rook.', 7: 'The only comfortable way to guard c7.', 8: 'Now develop normally.', 9: 'Development.', 10: 'Development.', 11: 'Castles. Black\'s knight on a6 is out of play.' } }
  ],
  sicilian: [
    { n: 'Open: Dragon', idea: 'Fianchetto the bishop and aim it down the long diagonal.', m: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6', t: { 9: 'The Dragon: the bishop goes to g7.', 10: 'White sets up the Yugoslav Attack.', 11: 'The Dragon bishop.', 12: 'Guards e4 and g4.', 13: 'Castle before the storm.', 14: 'White prepares to castle long and push the h-pawn.', 15: 'Develop and press on d4. Both sides attack on opposite wings.' } },
    { n: 'Alapin (2.c3)', idea: 'White wants a pawn centre. Hit e4 before it is built.', m: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6', t: { 2: 'The Alapin: White prepares d4.', 3: 'Attack e4 while c3 has taken the knight\'s square.', 4: 'White pushes on.', 5: 'A fine central square.', 6: 'The centre arrives.', 7: 'Trade.', 8: 'Recapture.', 9: 'Chip away at the e5 pawn.', 10: 'Development.', 11: 'More pressure on d4 and e5. Black is comfortable.' } },
    { n: 'Smith-Morra Gambit', idea: 'White gives a pawn for fast development. Take it and stay solid.', m: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6', t: { 2: 'White offers a pawn.', 3: 'Take it.', 4: 'The gambit.', 5: 'Take again. A pawn is a pawn.', 6: 'White has a lead in development.', 7: 'Development.', 8: 'Development.', 9: 'Guards e5 and opens the bishop.', 10: 'The bishop aims at f7.', 11: 'The key move: it blunts the bishop.', 12: 'Castles.', 13: 'Develop and castle next. Avoid the tricks on e6 and b5 and you are a pawn up.' } },
    { n: 'Closed Sicilian', idea: 'White keeps the centre closed. Mirror the setup.', m: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6', t: { 2: 'No d4: the Closed Sicilian.', 3: 'Control d4.', 4: 'A fianchetto.', 5: 'Match it.', 6: 'Development.', 7: 'Your bishop owns the long diagonal.', 8: 'Supports e4.', 9: 'A flexible setup. Expand on the queenside with Rb8 and b5.' } }
  ],
  french: [
    { n: 'Exchange Variation', idea: 'A symmetrical position. Simple development is enough.', m: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O', t: { 4: 'White releases the tension.', 5: 'Recapture. The c8 bishop is free now.', 6: 'Development.', 7: 'Development.', 8: 'A good diagonal.', 9: 'Copy it.', 10: 'Castles.', 11: 'Equal. The better player wins from here.' } },
    { n: 'Winawer', idea: 'Pin the knight and damage White\'s pawns.', m: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7', t: { 4: 'White defends e4 with the knight.', 5: 'The Winawer: pin it, and e4 is attacked again.', 6: 'White closes the centre.', 7: 'Hit the base at d4.', 8: 'White asks the bishop a question.', 9: 'Take, and double the pawns.', 10: 'White has the bishop pair and a wrecked queenside.', 11: 'The knight heads for f5 and guards the kingside.' } },
    { n: 'Tarrasch', idea: 'White avoids the pin. Play c5 and accept an isolated pawn.', m: 'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6', t: { 4: 'The Tarrasch: no pin is possible on d2.', 5: 'The knight on d2 blocks the bishop, so strike now.', 6: 'White trades.', 7: 'Keep a pawn in the centre.', 8: 'Development.', 9: 'Development.', 10: 'A pin.', 11: 'Active pieces make up for the isolated d-pawn.' } },
    { n: 'Classical', idea: 'Develop the knight first and meet the pin calmly.', m: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7', t: { 5: 'The Classical: a second attack on e4.', 6: 'A pin.', 7: 'Unpin.', 8: 'White gains space.', 9: 'The knight retreats, ready for c5 and f6.', 10: 'White trades bishops.', 11: 'Next comes c5, hitting the chain as always in the French.' } }
  ],
  caro: [
    { n: 'Advance Variation', idea: 'Get the bishop out, then play c5.', m: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6', t: { 4: 'White grabs space.', 5: 'The bishop comes out before e6. This is the point of the Caro-Kann.', 6: 'Development.', 7: 'Now the chain is safe to build.', 8: 'Quiet development.', 9: 'Attack the base at d4.', 10: 'Castles.', 11: 'A French Defence with the good bishop outside the chain.' } },
    { n: 'Exchange Variation', idea: 'An even structure. Develop to active squares.', m: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4', t: { 4: 'White trades.', 5: 'Recapture toward the centre.', 6: 'Stops Bf5.', 7: 'Pressure on d4.', 8: 'Support.', 9: 'Development.', 10: 'The best square.', 11: 'Your bishop gets out the other way. Then e6 and Bd6.' } },
    { n: 'Panov Attack', idea: 'White attacks d5 with c4. Hold it solidly.', m: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7', t: { 6: 'The Panov: White fights for d5.', 7: 'Defend with a piece.', 8: 'More pressure.', 9: 'Solid. The c8 bishop waits.', 10: 'Development.', 11: 'Castle next. White will get an isolated d-pawn for you to attack.' } }
  ],
  kid: [
    { n: 'Classical: Mar del Plata', idea: 'The centre locks. You attack the king, White the queenside.', m: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', t: { 12: 'White castles and keeps the tension.', 13: 'Pressure on d4 forces a decision.', 14: 'White closes the centre with tempo.', 15: 'The knight heads to the kingside. Next comes Nd7 and f5.' } },
    { n: 'Sämisch', idea: 'White builds a wall with f3. Strike with e5 and f5.', m: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5', t: { 8: 'The Sämisch: a rock on e4, and g4 becomes possible.', 9: 'Castle anyway.', 10: 'Development.', 11: 'The standard strike.', 12: 'White closes the centre.', 13: 'Clears the way for f5 and eyes f4.' } },
    { n: 'Four Pawns Attack', idea: 'White overextends. Break the centre with c5 and e6.', m: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6', t: { 8: 'Four pawns abreast. Impressive, and a target.', 9: 'Castle first.', 10: 'Development.', 11: 'Hit d4 from the side.', 12: 'White pushes past.', 13: 'Now chip at d5. A big centre needs defending.' } },
    { n: 'Fianchetto', idea: 'White copies your bishop. Play for e5 as usual.', m: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7', t: { 4: 'A quieter move order.', 5: 'The bishop goes where it always goes.', 6: 'White fianchettoes too.', 7: 'Castles.', 8: 'Bishop against bishop on the long diagonals.', 9: 'The usual pawn.', 10: 'Castles.', 11: 'Supports e5. The plan does not change.' } }
  ]
};
/* ---- four more openings, already in tree form ---- */
OPENINGS.push(
  {
    id: 'scotch', name: 'Scotch Game', side: 'w', idea: 'Open the centre on move three.',
    lines: [
      { n: 'Main line', idea: 'Trade knights, then gain space with e5.', m: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4', t: { 0: 'Centre first.', 1: 'Black answers in kind.', 2: 'Attack e5.', 3: 'Defend it.', 4: 'The Scotch: open the centre at once.', 5: 'Black has to take, or lose the pawn.', 6: 'A knight in the centre, and both bishops are free.', 7: 'Black develops and hits e4.', 8: 'Trade to damage the pawns.', 9: 'Recapture toward the centre.', 10: 'Gain space and chase the knight.', 11: 'A pin: the e-pawn cannot take the knight.', 12: 'Unpin and hold e5.', 13: 'The knight finds a central post.', 14: 'Chase it again. A sharp, modern main line.' } },
      { n: 'Classical with Bc5', idea: 'Black attacks your knight. Defend it and develop.', m: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4', t: { 7: 'Black attacks the knight on d4.', 8: 'Defend it and develop.', 9: 'A second attacker on d4.', 10: 'Solid support.', 11: 'Develops without blocking the queen.', 12: 'Aims at f7. Castle next.' } },
      { n: 'Scotch Gambit', idea: 'Develop instead of retaking the pawn.', m: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 e5 d5 Bb5 Ne4 cxd4 Bb6', t: { 6: 'A gambit: develop instead of retaking.', 7: 'Black develops and keeps the pawn.', 8: 'Offer a second pawn for the centre.', 9: 'Black declines and counterattacks e4.', 10: 'Chase the knight.', 11: 'The counterstrike that keeps Black in the game.', 12: 'Pin the knight instead of retreating.', 13: 'The knight jumps into the centre.', 14: 'The pawn is back, with a broad centre.', 15: 'The bishop retreats. An open fight with chances for both.' } }
    ]
  },
  {
    id: 'english', name: 'English Opening', side: 'w', idea: 'Control d5 from the wing and keep your options open.',
    lines: [
      { n: 'Reversed Sicilian', idea: 'Black takes the centre. Play a Sicilian with an extra move.', m: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7', t: { 0: 'The English: a wing pawn eyes d5.', 1: 'Black takes the centre: a Sicilian with colours reversed.', 2: 'More control of d5.', 3: 'Development.', 4: 'The bishop will own the long diagonal.', 5: 'Black opens the centre.', 6: 'Trade a wing pawn for a centre pawn.', 7: 'Recapture.', 8: 'Pressure on d5 and b7.', 9: 'The knight steps out of the bishop\'s line.', 10: 'Development.', 11: 'Development.', 12: 'Castles.', 13: 'A Dragon Sicilian with an extra move for you.' } },
      { n: 'Symmetrical', idea: 'Black copies. Break the symmetry with d4 when ready.', m: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O', t: { 1: 'Black copies.', 2: 'Control d5.', 3: 'Still copying.', 4: 'Fianchetto.', 5: 'And again.', 6: 'The long diagonal.', 7: 'The mirror image.', 8: 'Development.', 9: 'Development.', 10: 'Castles.', 11: 'Symmetry cannot last. Break it with d4 when you are ready.' } },
      { n: 'Into the Queen\'s Gambit', idea: 'Against e6 and d5, switch to a queen\'s pawn game.', m: 'c4 e6 Nc3 d5 d4 Nf6 Bg5 Be7 e3 O-O Nf3', t: { 1: 'Black prepares d5.', 2: 'Development.', 3: 'Black takes the centre.', 4: 'Now it is a Queen\'s Gambit: the English often becomes something else.', 5: 'Development.', 6: 'The familiar pin.', 7: 'Unpin.', 8: 'Solid.', 9: 'Castles.', 10: 'You have reached the Queen\'s Gambit Declined by another road.' } }
    ]
  },
  {
    id: 'nimzo', name: 'Nimzo-Indian', side: 'b', idea: 'Pin the knight and fight for e4 without a pawn.',
    lines: [
      { n: 'Rubinstein (4.e3)', idea: 'White develops calmly. Castle, then strike with d5 and c5.', m: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6', t: { 0: 'Queen\'s pawn.', 1: 'Stops e4.', 2: 'White takes space.', 3: 'Opens the bishop.', 4: 'White threatens e4.', 5: 'The Nimzo-Indian: the pin stops e4.', 6: 'Calm development.', 7: 'Castle first.', 8: 'The bishop takes aim.', 9: 'Claim the centre.', 10: 'Development.', 11: 'Hit d4 as well.', 12: 'Castles.', 13: 'Full development and pressure on the centre. A model position.' } },
      { n: 'Classical (4.Qc2)', idea: 'White avoids doubled pawns. Take the knight and rule e4.', m: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7', t: { 6: 'The queen guards c3, so the pawns will not be doubled.', 7: 'Castle.', 8: 'White asks the bishop a question.', 9: 'Give up the bishop pair for time.', 10: 'The queen recaptures. No doubled pawns, but she has moved twice.', 11: 'The bishop is going to b7 to rule e4.', 12: 'A pin.', 13: 'Control of e4 is the whole idea.' } },
      { n: 'Sämisch (4.a3)', idea: 'White forces the trade. Attack the doubled c-pawns.', m: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O', t: { 6: 'White forces the trade at once.', 7: 'Take: the c-pawns are doubled for good.', 8: 'White has the bishops and a big centre.', 9: 'Fix the weak pawn on c4.', 10: 'Support.', 11: 'Development. The knight will go to a5 to attack c4.', 12: 'Aimed at h7.', 13: 'Castles. Your target is c4, White\'s is your king.' } }
    ]
  },
  {
    id: 'scandi', name: 'Scandinavian', side: 'b', idea: 'Challenge e4 on move one and develop freely.',
    lines: [
      { n: 'Main line with Qa5', idea: 'Recapture with the queen and tuck her away on a5.', m: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5', t: { 0: 'King\'s pawn.', 1: 'The Scandinavian: challenge it at once.', 2: 'White takes.', 3: 'Recapture with the queen.', 4: 'White develops with tempo.', 5: 'The safest square, out of reach of the minor pieces.', 6: 'White takes the centre.', 7: 'Development.', 8: 'Development.', 9: 'A retreat path for the queen and a guard on d5.', 10: 'The bishop aims at f7.', 11: 'Your bishop gets out before e6. A solid setup.' } },
      { n: 'Modern (2...Nf6)', idea: 'Develop first and take the pawn back with the knight.', m: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O', t: { 3: 'Develop first, recapture later.', 4: 'White gives the pawn back.', 5: 'Now the knight takes, with no loss of time.', 6: 'Development.', 7: 'A fianchetto against the centre.', 8: 'Modest development.', 9: 'The bishop presses on d4.', 10: 'Castles.', 11: 'Castles. Next comes c5 against the centre.' } },
      { n: 'Retreat to d6', idea: 'Keep the queen central and flexible.', m: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6', t: { 5: 'A modern square: the queen watches d4 and stays central.', 6: 'Centre.', 7: 'Development.', 8: 'Development.', 9: 'Keeps a knight out of b5 and prepares b5 or Bg4.' } }
    ]
  }
);
/* ---- four more openings ---- */
OPENINGS.push(
  {
    id: 'vienna', name: 'Vienna Game', side: 'w', idea: 'A quiet second move that keeps the f-pawn free to advance.',
    lines: [
      { n: 'Vienna Gambit', idea: 'Push f4 with the knight already out.', m: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3', t: { 0: 'Centre first.', 1: 'Black answers in kind.', 2: 'The Vienna: guard e4 and keep the f-pawn free.', 3: 'The most natural reply, attacking e4.', 4: 'The Vienna Gambit: a King\'s Gambit with the knight already developed.', 5: 'The best answer: strike back in the centre.', 6: 'Take the pawn that matters.', 7: 'The knight takes, with an eye on a queen check at h4.', 8: 'Stops that check and develops.', 9: 'Development.', 10: 'A broad centre.', 11: 'Castles.', 12: 'Challenge the strong knight. You have space, Black has the outpost.' } },
      { n: 'The copycat trap', idea: 'Black copies your moves once too often.', m: 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1', t: { 3: 'Black copies.', 4: 'Development, with an eye on f7.', 5: 'Still copying.', 6: 'An early queen move with a point: g7 is attacked.', 7: 'A natural defence that fails.', 8: 'The knight hits the queen and c7 at once.', 9: 'The check looks strong but leads nowhere.', 10: 'The king steps aside. Now c7 and g7 both hang and Black cannot hold them.' } },
      { n: 'Quiet line', idea: 'Bishop first, then f4 when everything is ready.', m: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3', t: { 4: 'A calmer path: the bishop first.', 5: 'Development.', 6: 'Solid, and it frees the c1 bishop.', 7: 'Black mirrors.', 8: 'The f-pawn push the Vienna was made for.', 9: 'Black holds e5.', 10: 'Development. Next comes Na4 to trade off the strong bishop.' } }
    ]
  },
  {
    id: 'petrov', name: 'Petrov Defence', side: 'b', idea: 'Answer the attack on e5 with an attack on e4.',
    lines: [
      { n: 'Classical', idea: 'Chase the knight first, then take on e4.', m: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Be7 O-O O-O', t: { 0: 'King\'s pawn.', 1: 'The same.', 2: 'Attack on e5.', 3: 'The Petrov: counterattack instead of defending.', 4: 'White takes.', 5: 'Chase the knight first. Taking on e4 at once loses to Qe2.', 6: 'Back.', 7: 'Now the pawn is safely regained.', 8: 'Centre.', 9: 'Support the knight.', 10: 'Development, pressing on e4.', 11: 'Development.', 12: 'Castles.', 13: 'Castles. A solid, equal game.' } },
      { n: 'Four Knights', idea: 'White defends e4. Mirror the development.', m: 'e4 e5 Nf3 Nf6 Nc3 Nc6 Bb5 Bb4 O-O O-O d3 d6', t: { 4: 'White defends e4 instead of taking.', 5: 'Now it is a Four Knights Game.', 6: 'The Spanish bishop.', 7: 'Mirror it.', 8: 'Castles.', 9: 'Castles.', 10: 'Solid.', 11: 'Solid. Symmetry, and an even game.' } },
      { n: 'Central attack (3.d4)', idea: 'White opens the centre. Take e4 and develop.', m: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6', t: { 4: 'White strikes in the centre instead.', 5: 'Take the pawn.', 6: 'Attack on the knight.', 7: 'Support it.', 8: 'White regains the pawn.', 9: 'Challenge the strong knight at once.', 10: 'Trade.', 11: 'Recapture and develop.', 12: 'Castles.', 13: 'Active development and equal chances.' } }
    ]
  },
  {
    id: 'pirc', name: 'Pirc Defence', side: 'b', idea: 'Let White build a centre, then undermine it from the fianchetto.',
    lines: [
      { n: 'Classical', idea: 'Quiet development on both sides.', m: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6', t: { 0: 'King\'s pawn.', 1: 'A modest start that keeps options open.', 2: 'Full centre.', 3: 'Attack e4 at once.', 4: 'Defend it.', 5: 'The fianchetto is the point.', 6: 'Development.', 7: 'The bishop bears down on d4.', 8: 'Quiet development.', 9: 'Castles.', 10: 'Castles.', 11: 'Prepares b5 and gives the queen the c7 square. A flexible setup.' } },
      { n: 'Austrian Attack', idea: 'White pushes three pawns. Hit back with c5.', m: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 dxc5 Qa5 Bd3 Qxc5', t: { 6: 'The Austrian Attack: three pawns abreast.', 7: 'Keep developing.', 8: 'Development.', 9: 'Strike before White has castled.', 10: 'White takes.', 11: 'The pin on c3 wins the pawn back.', 12: 'Development.', 13: 'The pawn is regained and your queen is active.' } },
      { n: '150 Attack', idea: 'White lines up queen and bishop. Start queenside play first.', m: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5', t: { 6: 'A simple plan: Be3, Qd2, then trade off your bishop with Bh6.', 7: 'Develop anyway.', 8: 'Queen and bishop line up.', 9: 'Delay castling and start on the queenside.', 10: 'Supports e4 and prepares g4.', 11: 'Counterplay before White\'s attack lands.' } }
    ]
  },
  {
    id: 'dutch', name: 'Dutch Defence', side: 'b', idea: 'Take e4 away from White with the f-pawn and play on the kingside.',
    lines: [
      { n: 'Leningrad', idea: 'A King\'s Indian with the f-pawn already pushed.', m: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6', t: { 0: 'Queen\'s pawn.', 1: 'The Dutch: the f-pawn takes e4 away from White.', 2: 'The best setup against it.', 3: 'Development.', 4: 'The long diagonal.', 5: 'The Leningrad: fianchetto your own bishop.', 6: 'Development.', 7: 'Your own long diagonal.', 8: 'Castles.', 9: 'Castles.', 10: 'Space.', 11: 'Prepares e5. A fighting position.' } },
      { n: 'Stonewall', idea: 'Four pawns hold e4 for good.', m: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6', t: { 5: 'A different structure.', 6: 'Development.', 7: 'The Stonewall: pawns on d5, e6 and f5 hold e4.', 8: 'Castles.', 9: 'The best square for your good bishop.', 10: 'Pressure on d5.', 11: 'The wall is complete. Your knight will live on e4.' } },
      { n: 'Classical', idea: 'Modest development, then e5.', m: 'd4 f5 c4 Nf6 Nc3 e6 Nf3 Be7 g3 O-O Bg2 d6', t: { 2: 'White takes space first.', 3: 'Development.', 4: 'Development.', 5: 'Opens the bishop.', 6: 'Development.', 7: 'A modest square.', 8: 'The fianchetto arrives anyway.', 9: 'Castles.', 10: 'The long diagonal.', 11: 'Flexible: e5 is next.' } }
    ]
  }
);
OPENINGS.forEach(function (o) {
  if (!o.lines) o.lines = [{ n: MAINLINE[o.id][0], idea: MAINLINE[o.id][1], m: o.moves.join(' '), t: o.notes }].concat(VARIATIONS[o.id] || []);
  o.note = {};
  o.lines.forEach(function (l) {
    l.moves = l.m.split(' ');
    l.moves.forEach(function (_, k) {
      var path = l.moves.slice(0, k + 1).join(' ');
      if (l.t[k] && !o.note[path]) o.note[path] = l.t[k];
    });
  });
});
if (typeof module !== 'undefined') module.exports = { COURSE: COURSE, OPENINGS: OPENINGS };
