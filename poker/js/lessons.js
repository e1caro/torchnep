/* The lessons: ten steps from the hand ranking to bankroll and mindset. Plain data read by app.js.
 * In the text: {{cards As Kd}} draws cards, {{grid open.BTN}} a chart, {{ladder}} the hand ranking, {{seats}} the
 * seats of a six-player table, {{odds}} the table of outs. Every figure was worked out with js/engine.js
 * (equities from 300,000 runouts, counts by enumeration), not copied from elsewhere. */
(function (root) {
  'use strict';
  const LESSONS = [
    {
      id: 'hands', title: 'The hands', drill: 'showdown',
      intro: 'What beats what, and how seven cards become one five-card hand.',
      sections: [
        { h: 'Seven cards, one hand', body: `<p>Texas Hold'em gives you two cards of your own. Five more are dealt face up in the middle, the <em>board</em>, shared by everyone. Your hand is the best five cards you can make out of those seven: both of yours, one of them, or none.</p>{{cards Ah Kh}}<p class="cap">Your two cards. With a board of Q♥ J♥ T♥ 4♣ 2♦ they make a royal flush.</p>` },
        { h: 'From strongest to weakest', body: `<p>Each hand beats every hand below it. The numbers are how many of the 2,598,960 possible five-card hands are of that kind: the rarer, the stronger.</p>{{ladder}}` },
        { h: 'Ties and kickers', body: `<p>When two players have the same kind of hand, the higher cards in it decide: a pair of kings beats a pair of queens. If the pairs are equal, the side cards, the <em>kickers</em>, decide, one at a time, as far as five cards go.</p><p>K♠ K♦ with an ace beats K♣ K♥ with a queen. If both best five-card hands are the same rank for rank, the pot is split. Suits never break a tie.</p>` },
        { h: 'Traps that catch beginners', body: `<ul><li><b>The board plays.</b> If the five shared cards are better than anything you can make, everyone still in has that hand and splits the pot.</li><li><b>A flush needs five cards of one suit.</b> Four hearts are nothing until the fifth arrives.</li><li><b>An ace is high or low.</b> A-K-Q-J-T is the best straight, 5-4-3-2-A the lowest. A straight never goes round the corner: Q-K-A-2-3 is not one.</li><li><b>Only two pairs count.</b> With three pairs among your seven cards, the best two play and the fifth card is a kicker.</li></ul>` },
      ],
      quiz: [
        { q: 'The board is K♠ K♦ 7♣ 7♥ 2♠. You hold A♣ 3♦, your opponent Q♥ J♥. Who wins?', options: ['You', 'Your opponent', 'A split pot'], answer: 0, why: 'You both have two pair, kings and sevens. The fifth card decides: your ace beats their queen.' },
        { q: 'Which of these beats a flush?', options: ['A straight', 'A full house', 'Three of a kind'], answer: 1, why: 'Full house, four of a kind and straight flush beat a flush. A straight and three of a kind are below it.' },
        { q: 'The board is A♥ 2♦ 3♣ 4♠ 9♥ and you hold 5♣ K♦. What do you have?', options: ['Ace high', 'A straight, five high', 'A straight, king high'], answer: 1, why: 'The ace counts low: 5-4-3-2-A is a straight, the lowest one.' },
      ],
    },
    {
      id: 'flow', title: 'How a hand is played', drill: null,
      intro: 'Blinds, the four betting rounds, the five things you can do.',
      sections: [
        { h: 'The button and the blinds', body: `<p>One seat holds the <em>dealer button</em>; it moves one seat to the left after every hand. The two players to its left put in forced bets before any card is dealt: the <em>small blind</em> (half a big blind) and the <em>big blind</em>. The blinds give everyone something to win.</p><p>In this app every amount is in big blinds, written <b>bb</b>. That is how players compare results at any stake: a win rate of 5 bb per 100 hands means the same at small and big stakes.</p>{{seats}}` },
        { h: 'Four betting rounds', body: `<ol><li><b>Preflop</b>: everyone gets two cards. The player to the left of the big blind acts first, called <em>under the gun</em>.</li><li><b>Flop</b>: three board cards.</li><li><b>Turn</b>: a fourth.</li><li><b>River</b>: the fifth.</li></ol><p>After the flop, the first player still in to the left of the button acts first, so the button acts last on every round. A round ends when everyone still in has put in the same amount, or all but one have folded.</p>` },
        { h: 'What you can do', body: `<ul><li><b>Fold</b>: give up the hand and what you put in.</li><li><b>Check</b>: pass, when there is nothing to call.</li><li><b>Call</b>: match the bet in front of you.</li><li><b>Bet</b>: put chips in when nobody has.</li><li><b>Raise</b>: bet more than the bet in front of you.</li></ul><p>This is <em>no-limit</em> Hold'em: you can bet any amount up to everything in front of you. A raise must add at least as much as the last bet or raise did: after a raise from 1 to 3 bb (2 more), the next raise is to at least 5 bb.</p>` },
        { h: 'All-in and side pots', body: `<p>You can never be forced out of a hand for lack of chips: you go <em>all-in</em> with what you have. You can then win from each player only as much as you put in. Whatever the others bet beyond that forms a <em>side pot</em> that only they can win.</p><p>If two or more players are left after the river, the cards are shown, the <em>showdown</em>, and the best hand takes the pot.</p>` },
      ],
      quiz: [
        { q: 'Who acts first before the flop?', options: ['The small blind', 'The player to the left of the big blind', 'The button'], answer: 1, why: 'Before the flop the blinds act last, because they already have chips in. Under the gun, left of the big blind, starts.' },
        { q: 'The big blind is 1 bb and someone raises to 3 bb. What is the smallest re-raise?', options: ['To 4 bb', 'To 5 bb', 'To 6 bb'], answer: 1, why: 'The raise added 2 bb, so the next one must add at least 2 more: to 5 bb.' },
        { q: 'You are all-in for 20 bb and two players behind you each put in 60 bb. What can you win?', options: ['All 140 bb', '20 bb from each of them, 60 bb in all with your own', 'Nothing: you have no chips left'], answer: 1, why: 'The main pot is 20 bb from each of the three of you. The other 80 bb are a side pot between the two of them.' },
      ],
    },
    {
      id: 'position', title: 'Position', drill: 'preflop',
      intro: 'Why the seat you sit in decides which hands you can play.',
      sections: [
        { h: 'Acting last is worth chips', body: `<p>The player who acts last sees what everyone else did before deciding. They can bet when the others look weak, check behind with a medium hand to see a free card, and keep the pot small when they are unsure. Being <em>in position</em> on someone means acting after them.</p>` },
        { h: 'The six seats', body: `{{seats}}<p><b>Under the gun (UTG)</b>, <b>hijack (HJ)</b>, <b>cutoff (CO)</b>, <b>button (BTN)</b>, <b>small blind (SB)</b> and <b>big blind (BB)</b>. The button acts last on every street after the flop, which makes it the best seat. The blinds act last before the flop but first after it, which makes them the worst, even though they have chips in already.</p>` },
        { h: 'Play more hands the later you sit', body: `<p>Under the gun five players still act behind you, any of whom may wake up with a big hand, and after the flop you will be out of position. On the button only the blinds are left. So the charts open about 18% of hands under the gun and about 44% on the button.</p>{{grid open.UTG}}{{grid open.BTN}}` },
      ],
      quiz: [
        { q: 'Which seat acts last after the flop?', options: ['The big blind', 'The button', 'Under the gun'], answer: 1, why: 'After the flop the action starts left of the button and ends on it.' },
        { q: 'Why play fewer hands under the gun?', options: ['The blinds are bigger there', 'Five players act after you and you will be out of position', 'You must call every raise'], answer: 1, why: 'More players behind you means more chances someone holds a strong hand, and acting first after the flop costs you chips.' },
        { q: 'Small blind against big blind after the flop: who acts first?', options: ['The small blind', 'The big blind'], answer: 0, why: 'The small blind sits first to the left of the button, so it acts first on the flop, turn and river.' },
      ],
    },
    {
      id: 'starting', title: 'Starting hands', drill: 'preflop',
      intro: 'The 13 by 13 grid, combinations, and which hands to raise first in.',
      sections: [
        { h: 'The grid of 169 hands', body: `<p>Without counting suits there are 169 different starting hands. Players lay them out in a 13 by 13 grid: pairs on the diagonal, <b>suited</b> hands (both cards of one suit, like A♠K♠) above it, <b>offsuit</b> ones below.</p><p>A pair can be dealt 6 ways, a suited hand 4 ways and an offsuit hand 12 ways, 1,326 combinations in all. So AKo comes three times as often as AKs, and a chart that looks half empty can still hold a lot of hands.</p>{{grid open.CO}}` },
        { h: 'What makes a hand good', body: `<ul><li><b>High cards</b> make top pairs that win.</li><li><b>Pairs</b> start ahead and sometimes make sets.</li><li><b>Suited cards</b> make flushes: about 2 to 3 points of equity more than the same hand offsuit.</li><li><b>Connected cards</b> make straights.</li></ul><p>Beware <em>domination</em>: A-J against A-K shares the ace, so when both pair it the jack kicker loses. AJ wins only about 26% against AK.</p>` },
        { h: 'Raise first in, do not limp', body: `<p>When everyone folds to you, raise to 2.5 bb (3 bb from the small blind) or fold. Just calling the big blind, <em>limping</em>, lets the blinds in cheaply and gives up the chance to win the pot right away. The raiser also gets to continue the story after the flop.</p><p>The charts here are for six-player cash games with 100 bb stacks. They are close to what solving programs play, rounded so that each hand has one action you can remember.</p>{{grid open.HJ}}{{grid open.SB}}` },
      ],
      quiz: [
        { q: 'How many ways can you be dealt AKo?', options: ['4', '6', '12'], answer: 2, why: 'Four aces times four kings is 16 combinations; 4 of them are suited, so 12 are offsuit.' },
        { q: 'It is folded to you on the button with K♣ 8♦.', options: ['Fold', 'Call', 'Raise'], answer: 2, why: 'The button chart opens K8o and better offsuit kings. Only the blinds are left to beat.' },
        { q: 'It is folded to you under the gun with K♣ 9♦.', options: ['Fold', 'Call', 'Raise'], answer: 0, why: 'Under the gun the chart opens offsuit kings only from KJ up. K9o is often dominated by the hands that call.' },
      ],
    },
    {
      id: 'raise', title: 'Facing a raise', drill: 'preflop',
      intro: 'Re-raise, call or fold: what changes when someone raised before you.',
      sections: [
        { h: 'A raise says something', body: `<p>A player who raises under the gun has about the best 18% of hands. You need a stronger hand to play against them than you would need to raise yourself. Your options: fold, call, or raise again, which players call a <em>3-bet</em>.</p>{{grid vsEarly.IP}}` },
        { h: 'Why 3-bet', body: `<p>For <b>value</b> with the very best hands (QQ and better, AK), so that the pot grows while you are ahead. And with a few <b>bluffs</b> chosen with care: A5s and A4s hold an ace, which makes AA and AK less likely for the opponent, and they can still make straights and flushes when called.</p><p>Calling works best in position and with hands that make strong hands after the flop: pairs that can hit a set, suited high cards.</p>` },
        { h: 'The blinds', body: `<p>The <b>big blind</b> already has 1 bb in. Against a raise to 2.5 bb it calls 1.5 bb to win 5.5 bb, so it needs only about 27% equity: it defends much wider, more so against a late raiser.</p>{{grid vsLate.BB}}<p>The <b>small blind</b> mostly re-raises or folds: the big blind still acts behind it, and it will be out of position for the rest of the hand.</p>{{grid vsLate.SB}}` },
        { h: 'When they raise again', body: `<p>You open and someone 3-bets. Keep going with the strongest hands (raise again with QQ+, AK) and call with good pairs and strong suited cards, more of them when you will act last after the flop. Fold the rest: an opening range is far weaker than a 3-betting one.</p>{{grid vs3bet.IP}}` },
      ],
      quiz: [
        { q: 'Under the gun raises. You hold A♣ J♦ on the button.', options: ['Fold', 'Call', '3-bet'], answer: 0, why: 'AJo is dominated by the AQ and AK in an early raiser\'s range. The chart calls AQo but folds AJo.' },
        { q: 'The button raises to 2.5 bb. You hold K♥ 5♥ in the big blind.', options: ['Fold', 'Call', '3-bet'], answer: 1, why: 'You need about 27% and a button raise is wide. Suited kings down to K5s defend.' },
        { q: 'Why 3-bet A5s rather than AJo as a bluff?', options: ['A5s is the stronger hand', 'Its ace makes AA and AK less likely, and it makes straights and flushes when called', 'AJo is never played'], answer: 1, why: 'A5s blocks the hands that would continue and keeps equity when called. AJo does better as a call or a fold.' },
      ],
    },
    {
      id: 'outs', title: 'Outs and equity', drill: 'outs',
      intro: 'Counting the cards that win, and turning them into a percentage.',
      sections: [
        { h: 'Equity', body: `<p>Your <em>equity</em> is your share of the pot if every card were dealt and nobody folded. 40% equity in a 10 bb pot is worth 4 bb on average. Before the flop it comes from the two hands; after it, from the cards still to come.</p>` },
        { h: 'Outs', body: `<p>An <em>out</em> is an unseen card that makes your hand the best. The common ones:</p><ul><li>Flush draw: <b>9</b> (13 of a suit, 4 of them in sight)</li><li>Open-ended straight draw: <b>8</b></li><li>Gutshot (one card fills the middle): <b>4</b></li><li>Flush draw and open-ender: <b>15</b></li><li>Flush draw and gutshot: <b>12</b></li><li>Pocket pair hoping for a set: <b>2</b></li></ul>{{cards 9h 8h}}<p class="cap">On T♥ 7♥ 2♣: nine hearts and six more sixes and jacks, 15 outs.</p>` },
        { h: 'The rule of 2 and 4', body: `<p>On the flop, with the turn and the river to come, outs × 4 is roughly your chance to hit by the river. With one card to come, outs × 2. Above 8 outs the rule runs a little high: 15 outs × 4 says 60%, the truth is 54%.</p>{{odds}}<p>Discount outs that help the other player too: a fourth heart when they may hold a bigger flush, a card that pairs the board when they may have a set.</p>` },
        { h: 'Matchups to know before the flop', body: `<ul><li>Pair against two higher cards: about even (QQ v AKo 57%, 22 v AKs 50%).</li><li>Pair against a lower pair: about 80% (99 v 66).</li><li>Dominated: AK v AQ 74%.</li><li>Two high cards against two lower ones: about 60 to 64% (KQo v 87o 64%, AKo v 87s 58%).</li><li>AA against KK: 82%.</li></ul>` },
      ],
      quiz: [
        { q: 'You hold 9♥ 8♥ on T♥ 7♥ 2♣. How many outs to a straight or a flush?', options: ['9', '12', '15'], answer: 2, why: 'Nine hearts make a flush; the three non-heart sixes and three non-heart jacks make a straight. 15 in all.' },
        { q: 'All-in on the flop with a flush draw: about how often do you hit by the river?', options: ['About 18%', 'About 35%', 'About 50%'], answer: 1, why: '9 outs × 4 = 36%. The exact figure is 35%.' },
        { q: 'QQ against AKo before the flop:', options: ['QQ is a big favourite', 'QQ is a small favourite', 'AKo is the favourite'], answer: 1, why: 'QQ wins about 57%: a pair against two higher cards is close to a coin flip, the pair a little ahead.' },
      ],
    },
    {
      id: 'odds', title: 'Pot odds', drill: 'potodds',
      intro: 'The price of a call, and when a draw is worth paying for.',
      sections: [
        { h: 'The price', body: `<p>When you call you pay to win the pot. The share of the pot you must win to break even is</p><p class="formula">your call ÷ the pot after you call</p><p>The pot is 10 bb and the opponent bets 5 bb: you call 5 to win 15 + your 5, so you need 5 ÷ 20 = 25%.</p>` },
        { h: 'Prices worth knowing', body: `<table class="mini"><tr><th>Bet</th><th>You need</th></tr><tr><td>A third of the pot</td><td>20%</td></tr><tr><td>Half the pot</td><td>25%</td></tr><tr><td>Two thirds</td><td>29%</td></tr><tr><td>Three quarters</td><td>30%</td></tr><tr><td>The pot</td><td>33%</td></tr><tr><td>Twice the pot</td><td>40%</td></tr></table><p>If your equity is above the price, the call makes money in the long run, win or lose this time.</p>` },
        { h: 'One card at a time', body: `<p>Facing a bet on the flop with more betting to come, count only the next card (outs × 2): the turn will cost you again. Only when you are all-in do both cards come for one price.</p><p>A flush draw on the flop facing a pot-sized bet: you need 33%, the next card brings 19%. Fold, unless the money still behind changes the sum.</p>` },
        { h: 'Implied odds, and the reverse', body: `<p><b>Implied odds</b>: when you hit a draw to the best possible hand with deep stacks, you will often win more chips later. That lets you call a little more than the price. <b>Reverse implied odds</b>: weak draws and weak top pairs win small pots and lose big ones. A draw to a low flush is worth less than its outs suggest.</p>` },
      ],
      quiz: [
        { q: 'The pot is 12 bb and the opponent bets 6 bb. What equity do you need to call?', options: ['20%', '25%', '33%'], answer: 1, why: '6 ÷ (12 + 6 + 6) = 25%.' },
        { q: 'Turn: pot 8 bb, they bet 8 bb. You have a flush draw, about 19% with one card to come.', options: ['Call', 'Fold'], answer: 1, why: 'A pot-sized bet asks for 33%. 19% is far short: fold.' },
        { q: 'Why may a nut flush draw call a little more than the price?', options: ['It always wins', 'When it hits it can win more chips later (implied odds)', 'Flushes split the pot'], answer: 1, why: 'Hitting the best possible hand with chips left to bet pays more than the pot in front of you.' },
      ],
    },
    {
      id: 'betting', title: 'Betting with a purpose', drill: null,
      intro: 'Value bets, bluffs, continuation bets and sizes.',
      sections: [
        { h: 'Value or bluff', body: `<p>Every bet should be one of two things. A <b>value bet</b> wants worse hands to call. A <b>bluff</b> wants better hands to fold. If you cannot say which yours is, check.</p>` },
        { h: 'Value', body: `<p>Bet your strong hands; people who wait to trap win small pots. Bet bigger on boards full of draws (Q♥ J♥ 9♣) to make the draws pay, smaller on dry ones (K♠ 7♦ 2♣) where few hands can call. Against players who call too much, bet thinner: top pair is a value bet for three streets against a calling station.</p>` },
        { h: 'Bluffs', body: `<p>The best bluffs have outs: a flush draw that bets wins when they fold and can still win when they call (a <em>semi-bluff</em>). Bluff one opponent rather than three. Bluff on boards that fit your story: the preflop raiser on A-K-x has many more aces and kings than the caller.</p>` },
        { h: 'The continuation bet', body: `<p>The preflop raiser often bets the flop, a <em>c-bet</em>. Against one opponent on a dry board, a small bet (a third of the pot) works often, because most flops miss most hands. On wet boards and against several players, bet less often and bigger, mostly with real hands and good draws.</p><p>Medium hands, like middle pair, check more: they want to see cheap cards and get to showdown, not to grow a pot they may lose.</p>` },
      ],
      quiz: [
        { q: 'You have the best possible hand on the river against a calling station.', options: ['Check, to trap', 'Bet big', 'Bet tiny'], answer: 1, why: 'A calling station calls with worse hands. Bet big for value.' },
        { q: 'Which flop hand makes the better bluff?', options: ['A flush draw', 'Nothing at all', 'Middle pair'], answer: 0, why: 'A semi-bluff wins when they fold and still has nine outs when they call.' },
        { q: 'Four players see the flop and it misses you completely.', options: ['C-bet big', 'Check', 'Go all-in'], answer: 1, why: 'Against three opponents someone usually has something. Bluffs work best against one.' },
      ],
    },
    {
      id: 'reading', title: 'Reading the board and the player', drill: 'nuts',
      intro: 'Board textures, the nuts, ranges and the four kinds of opponent.',
      sections: [
        { h: 'Textures', body: `<p><b>Dry</b> boards like K♠ 7♦ 2♣ have few draws: whoever is ahead now is usually ahead at the end. <b>Wet</b> boards like J♥ T♥ 8♣ are full of straight and flush draws, and the lead changes often. <b>Paired</b> boards make full houses possible; <b>monotone</b> ones (three of a suit) make flushes possible already.</p>` },
        { h: 'The nuts', body: `<p>The <em>nuts</em> is the best hand anyone could hold on this board. On 9♠ 8♠ 7♦ 2♣ K♥ it is J-T, a straight to the jack. Find it on every board: it tells you how strong your own hand really is, and what a big bet may mean.</p>` },
        { h: 'Think in ranges', body: `<p>You will rarely know someone's exact cards, but you can know their <em>range</em>: the hands they would play this way. An under-the-gun raiser who bets flop, turn and river has a range full of strong hands. A player who called before the flop and checks every street rarely has the nuts. The coach at the table does this: it guesses each opponent's hands from what they did and weighs them toward strength each time they bet.</p>` },
        { h: 'The four players at the table', body: `<ul><li><b>Regular</b>: plays the charts, bets with a reason.</li><li><b>Rock</b>: very tight. When a rock raises, believe it and fold one pair.</li><li><b>Calling station</b>: calls far too much. Value-bet them, never bluff them.</li><li><b>Maniac</b>: raises and bluffs a lot. Call down lighter, let them bet into you.</li></ul>` },
      ],
      quiz: [
        { q: 'The board is 9♠ 8♠ 7♦ 2♣ K♥. What is the nuts?', options: ['K-K, a set of kings', 'J-T, a straight to the jack', '6-5, a straight to the nine'], answer: 1, why: 'J-T makes J-T-9-8-7. With only two spades on the board there is no flush.' },
        { q: 'Top pair, good kicker on the river against a calling station. They check to you.', options: ['Bet', 'Check'], answer: 0, why: 'A calling station calls with worse pairs and missed draws. Bet for value.' },
        { q: 'A rock raises your bet on the turn and you have one pair.', options: ['Re-raise', 'Usually fold', 'Always call'], answer: 1, why: 'A rock raises with strong hands only: two pair or better beats your one pair.' },
      ],
    },
    {
      id: 'mind', title: 'Bankroll and mindset', drill: null,
      intro: 'Variance, how much money to sit down with, and how to keep improving.',
      sections: [
        { h: 'Decisions, not results', body: `<p>A 74% favourite still loses one time in four. Even a winning player has losing weeks. Judge a hand by the decision: was the call good for the price and the range? Over thousands of hands, good decisions win.</p>` },
        { h: 'Bankroll', body: `<p>Play cash games with at least 20 to 30 buy-ins for the stake you play, more if you are still learning. Move down a stake after a bad run instead of chasing losses. Only ever play with money you can afford to lose.</p>` },
        { h: 'Tilt', body: `<p>After a bad beat many players start calling too much or bluffing too much: <em>tilt</em>. Notice it and stop. Set a limit on losses for a session before you sit down.</p>` },
        { h: 'How to keep getting better', body: `<p>Play a session at the table with the coach on. Afterwards open the hand review: every decision is marked good, fine or a mistake, with the numbers behind it. Then train the leak in the drills. Turn the hints off now and then to see how much has stuck.</p><p>Real-money poker is gambling. If it stops being fun or you play for longer or more than you meant to, stop, and talk to someone; most countries have a free helpline for gambling problems.</p>` },
      ],
      quiz: [
        { q: 'You lose three big pots in a row with the best hand going in. Your decisions were right.', options: ['Change your strategy', 'Keep making the same decisions', 'Play more hands to win it back'], answer: 1, why: 'Losing as a favourite is variance. The decisions were right; chasing the losses would not be.' },
        { q: 'How many buy-ins is a sensible bankroll for cash games?', options: ['2 or 3', '20 to 30 or more', 'Whatever is in your pocket'], answer: 1, why: 'Swings of several buy-ins are normal even for good players.' },
        { q: 'You notice you are angry and calling everything.', options: ['Keep playing to win it back', 'Take a break', 'Raise the stakes'], answer: 1, why: 'Tilted decisions cost money. Stop and come back later.' },
      ],
    },
  ];

  const DRILLS = [
    { id: 'showdown', title: 'Which hand wins?', about: 'Two hands and a board: pick the winner, or a split.', target: 20, lesson: 'hands' },
    { id: 'preflop', title: 'Open, call or fold', about: 'A seat, the action before you and your hand: play it by the chart.', target: 30, lesson: 'starting' },
    { id: 'outs', title: 'Count the outs', about: 'A draw on the flop or the turn: how many cards complete it?', target: 15, lesson: 'outs' },
    { id: 'potodds', title: 'Pot odds', about: 'The pot, a bet and your draw: the price, then call or fold.', target: 20, lesson: 'odds' },
    { id: 'equity', title: 'Who is ahead?', about: 'Two hands before the flop: how big a favourite is the first?', target: 15, lesson: 'outs' },
    { id: 'nuts', title: 'Find the nuts', about: 'A board: which two cards would make the best hand?', target: 15, lesson: 'reading' },
  ];

  const api = { LESSONS, DRILLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PKL = api;
})(typeof window !== 'undefined' ? window : globalThis);
