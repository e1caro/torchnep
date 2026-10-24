'use strict';
// Sports Academy: pick a sport and a position, train with position-specific drills, grow a player card
// (six attributes and an overall rating), earn career milestones and play a match every week.
// Drills go through the normal workout pipeline, so they also give XP, coins and quest progress.

// TT(english, spanish) registers the Spanish text and returns the English one.
const TT = (en, es) => { if (typeof i18nAdd === 'function') i18nAdd({ [en]: es }); return en; };

const SATTRS = ['SPD', 'PWR', 'STA', 'AGI', 'STR', 'CORE'];
const ATTR = {
  SPD: [TT('Speed', 'Velocidad'), '#ffd34d', TT('pace', 'ritmo')], PWR: [TT('Power', 'Potencia'), '#ff6a3d', TT('power', 'potencia')], STA: [TT('Stamina', 'Resistencia'), '#3ddc97', TT('stamina', 'resistencia')],
  AGI: [TT('Agility', 'Agilidad'), '#6db6ff', TT('agility', 'agilidad')], STR: [TT('Strength', 'Fuerza'), '#ff5c6c', TT('strength', 'fuerza')], CORE: [TT('Core', 'Core'), '#b46bff', TT('balance', 'equilibrio')],
};
if (typeof i18nAdd === 'function') i18nAdd({ SPD: 'VEL', PWR: 'POT', STA: 'RES', AGI: 'AGI', STR: 'FUE', CORE: 'CORE' });

// Kinds of drill: how the exercises are picked, and which attributes a finished drill raises.
const PLY = ['plyometrics'], STRG = ['strength', 'powerlifting', 'olympic weightlifting', 'strongman'];
const KINDS = {
  sprint: { sets: 4, reps: '20s', rest: 40, gains: { SPD: 34, PWR: 8, AGI: 6 }, slots: [{ c: PLY, re: /sprint|acceleration|start|skipping|stride|butt kick|carioca|climber/ }, { c: PLY, re: /bound|skip|hop|quick|leap/ }, { c: PLY, re: /jump|hop/ }, { m: ['hamstrings'] }, { m: ['glutes'] }, { m: ['calves'] }] },
  power: { sets: 4, reps: '6', rest: 75, gains: { PWR: 34, SPD: 8, STR: 8 }, slots: [{ c: PLY, re: /box jump|depth|rocket|split|knee tuck|long jump|jump/ }, { c: PLY, re: /jump|leap|bound/ }, { m: ['quadriceps'] }, { m: ['hamstrings', 'glutes'] }, { c: [...PLY, ...STRG], re: /swing|squat|clean|snatch/ }, { m: ['calves'] }] },
  agility: { sets: 4, reps: '20s', rest: 30, gains: { AGI: 34, SPD: 8, CORE: 6 }, slots: [{ c: PLY, re: /lateral|side|carioca|shuffle|cone|scissors|star/ }, { c: PLY, re: /lateral|side|carioca|shuffle|cone|scissors|star/ }, { c: PLY, re: /lateral|side|carioca|shuffle|cone|scissors|star|hop/ }, { c: PLY, re: /hop|bound|quick/ }, { m: ['abductors'] }, { m: ['adductors'] }] },
  stamina: { sets: 3, reps: '40s', rest: 20, bw: true, gains: { STA: 36, CORE: 6, SPD: 4 }, slots: [{}, {}, {}, {}, {}, {}] },
  lower: { sets: 4, reps: '8', rest: 90, gains: { STR: 30, PWR: 12, CORE: 4 }, slots: [{ m: ['quadriceps'] }, { m: ['quadriceps'] }, { m: ['hamstrings'] }, { m: ['glutes'] }, { m: ['calves'] }, { m: ['abdominals'] }] },
  upper: { sets: 4, reps: '10', rest: 60, gains: { STR: 30, CORE: 6, PWR: 6 }, slots: [{ m: ['chest'] }, { m: ['lats'] }, { m: ['shoulders'] }, { m: ['middle back'] }, { m: ['triceps'] }, { m: ['biceps'] }] },
  core: { sets: 3, reps: '15', rest: 30, gains: { CORE: 34, STR: 6, AGI: 4 }, slots: [{ m: ['abdominals'] }, { m: ['abdominals'] }, { m: ['abdominals'] }, { m: ['abdominals'] }, { m: ['lower back'] }, { m: ['lower back'] }] },
  contact: { sets: 4, reps: '10', rest: 60, gains: { STR: 26, CORE: 14, PWR: 8 }, slots: [{ m: ['neck'] }, { m: ['traps'] }, { m: ['abdominals'] }, { m: ['quadriceps'] }, { m: ['chest'] }, { m: ['lats'] }] },
  throw: { sets: 4, reps: '8', rest: 45, gains: { PWR: 28, STR: 10, AGI: 6 }, slots: [{ c: PLY, re: /throw|slam|pass|chest push|swing/ }, { c: PLY, re: /throw|slam|pass|chest push|swing/ }, { c: PLY, re: /throw|slam|pass|chest push|swing/ }, { m: ['shoulders'] }, { m: ['lats'] }, { m: ['triceps'] }] },
  shoulder: { sets: 3, reps: '12', rest: 45, gains: { STR: 22, CORE: 10, AGI: 8 }, slots: [{ m: ['shoulders'] }, { m: ['shoulders'] }, { m: ['shoulders'] }, { m: ['lats'] }, { m: ['middle back'] }, { m: ['triceps'] }] },
};
const DRILL_MUSCLES = { sprint: ['quadriceps', 'hamstrings', 'glutes'], power: ['quadriceps', 'glutes'], agility: ['abductors', 'quadriceps'], stamina: ['quadriceps', 'abdominals'], throw: ['shoulders', 'chest'] };

// ---------- catalogue ----------
const RL = (pos, name, desc, w, drills) => ({ pos, name, desc, w, drills });
const DR = (kind, name, desc) => ({ kind, name, desc });
const SPORTS = {
  football: { ico: '⚽', name: TT('Football', 'Fútbol'), unit: 'goals', roles: {
    striker: RL('ST', TT('Striker', 'Delantero'), TT('Finish chances: explosive legs, sharp starts and a strong base.', 'Define las ocasiones: piernas explosivas, arrancadas rápidas y una base fuerte.'), { SPD: 3, PWR: 3, AGI: 2, STR: 2, STA: 1.5, CORE: 1.5 }, [
      DR('sprint', TT('Acceleration Burst', 'Explosión de aceleración'), TT('Short, violent sprints to beat the last defender.', 'Sprints cortos y explosivos para ganarle la espalda al último defensa.')),
      DR('power', TT('Finishing Power', 'Potencia de remate'), TT('Jumps and heavy legs for shots and headers.', 'Saltos y piernas fuertes para disparos y remates de cabeza.')),
      DR('contact', TT('Aerial Duels', 'Duelos aéreos'), TT('Neck, core and strength to win the ball in the air.', 'Cuello, core y fuerza para ganar el balón por alto.')),
      DR('lower', TT('Strong Base', 'Base sólida'), TT('Heavy legs so defenders cannot push you off the ball.', 'Piernas fuertes para que los defensas no te quiten el balón.'))]),
    winger: RL('WG', TT('Winger', 'Extremo'), TT('Beat defenders on the flank: top speed, quick turns and stamina.', 'Gana la banda: velocidad punta, giros rápidos y resistencia.'), { SPD: 3.5, AGI: 3, STA: 2, PWR: 1.5, CORE: 1, STR: 1 }, [
      DR('sprint', TT('Flank Sprints', 'Sprints por la banda'), TT('Repeated sprints down the wing.', 'Sprints repetidos por la banda.')),
      DR('agility', TT('Cut and Dribble', 'Recorte y regate'), TT('Lateral hops and quick feet to beat your marker.', 'Saltos laterales y pies rápidos para driblar a tu marcador.')),
      DR('stamina', TT('Up and Down the Line', 'Arriba y abajo'), TT('A bodyweight circuit to keep running for 90 minutes.', 'Un circuito con tu peso para correr los 90 minutos.')),
      DR('power', TT('Explosive Legs', 'Piernas explosivas'), TT('Jumps for sudden changes of pace.', 'Saltos para cambios de ritmo bruscos.'))]),
    midfielder: RL('CM', TT('Midfielder', 'Centrocampista'), TT('Run all game: engine, balance and duels.', 'Corre todo el partido: motor, equilibrio y duelos.'), { STA: 3.5, AGI: 2, STR: 2, SPD: 1.5, PWR: 1, CORE: 2 }, [
      DR('stamina', TT('The Engine', 'El motor'), TT('A long circuit to cover every blade of grass.', 'Un circuito largo para cubrir todo el campo.')),
      DR('agility', TT('Turn and Pass', 'Giro y pase'), TT('Quick feet and lateral work in tight spaces.', 'Juego de pies y trabajo lateral en espacios cortos.')),
      DR('core', TT('Balance and Core', 'Equilibrio y core'), TT('A strong middle to shield the ball.', 'Un centro fuerte para proteger el balón.')),
      DR('lower', TT('Box-to-Box Legs', 'Piernas de área a área'), TT('Leg strength for every tackle and run.', 'Fuerza de piernas para cada entrada y carrera.'))]),
    defender: RL('CB', TT('Defender', 'Defensa'), TT('Win duels and aerial battles: strength, power and a solid core.', 'Gana duelos y balones aéreos: fuerza, potencia y un core sólido.'), { STR: 3.5, PWR: 2.5, CORE: 2.5, SPD: 1.5, STA: 1.5, AGI: 1 }, [
      DR('contact', TT('Brick Wall', 'Muro de ladrillo'), TT('Neck, traps and core for tough duels.', 'Cuello, trapecios y core para duelos duros.')),
      DR('lower', TT('Heavy Legs', 'Piernas pesadas'), TT('Raw leg strength for tackles.', 'Fuerza bruta de piernas para las entradas.')),
      DR('power', TT('Headers and Clearances', 'Cabezazos y despejes'), TT('Jump power to clear every cross.', 'Salto potente para despejar cada centro.')),
      DR('sprint', TT('Recovery Runs', 'Carreras de recuperación'), TT('Short sprints to get back and close the gap.', 'Sprints cortos para volver y cerrar el hueco.'))]),
    goalkeeper: RL('GK', TT('Goalkeeper', 'Portero'), TT('Explode for saves: reflex power, agility and shoulders.', 'Explota para parar: potencia de reflejos, agilidad y hombros.'), { AGI: 3.5, PWR: 3, CORE: 2, STR: 1.5, SPD: 1, STA: 1 }, [
      DR('agility', TT('Reflex Saves', 'Paradas de reflejos'), TT('Lateral hops and fast feet to reach every corner.', 'Saltos laterales y pies rápidos para llegar a cada esquina.')),
      DR('shoulder', TT('Shot-Stopper Shoulders', 'Hombros de parador'), TT('Strong shoulders and back to catch and punch.', 'Hombros y espalda fuertes para atrapar y despejar.')),
      DR('power', TT('Diving Power', 'Potencia de estirada'), TT('Explosive jumps for top-corner saves.', 'Saltos explosivos para las escuadras.')),
      DR('core', TT('Landing Core', 'Core de aterrizaje'), TT('A tough core to take every dive.', 'Un core duro para aguantar cada estirada.'))]) } },
  futsal: { ico: '🥅', name: TT('Futsal', 'Fútbol sala'), unit: 'goals', roles: {
    keeper: RL('GK', TT('Futsal Goalkeeper', 'Portero de sala'), TT('Close range saves and quick throws: reflexes, agility and power.', 'Paradas a bocajarro y saques rápidos: reflejos, agilidad y potencia.'), { AGI: 3.5, PWR: 3, CORE: 2, STR: 1.5, SPD: 1.5, STA: 1 }, [
      DR('agility', TT('Point-Blank Reflexes', 'Reflejos a bocajarro'), TT('Lateral hops for saves from two metres.', 'Saltos laterales para paradas a dos metros.')),
      DR('throw', TT('Fast Throw-Outs', 'Saques rápidos'), TT('Explosive throws to start counter-attacks.', 'Lanzamientos explosivos para iniciar contraataques.')),
      DR('power', TT('Block and Spread', 'Cruz y estirada'), TT('Jumps to spread big and close angles.', 'Saltos para hacerte grande y cerrar ángulos.')),
      DR('core', TT('Goal-Line Core', 'Core bajo palos'), TT('A tough core for low saves.', 'Un core duro para las paradas bajas.'))]),
    fixo: RL('FIX', TT('Fixo', 'Cierre'), TT('The last defender: strength, reading the game and quick recoveries.', 'El último defensa: fuerza, lectura del juego y recuperaciones rápidas.'), { STR: 3, AGI: 2.5, STA: 2.5, CORE: 2, SPD: 2, PWR: 1.5 }, [
      DR('contact', TT('Hold the Pivot', 'Aguantar al pívot'), TT('Neck, core and strength to win body duels.', 'Cuello, core y fuerza para ganar los duelos al cuerpo.')),
      DR('agility', TT('Defensive Shuffle', 'Desplazamiento defensivo'), TT('Lateral steps to stay in front of attackers.', 'Pasos laterales para seguir delante del atacante.')),
      DR('stamina', TT('Rotation Engine', 'Motor de rotaciones'), TT('A circuit for constant pressing and rotations.', 'Un circuito para presión y rotaciones constantes.')),
      DR('lower', TT('Long-Shot Legs', 'Piernas de disparo lejano'), TT('Leg strength for shots from distance.', 'Fuerza de piernas para disparar de lejos.'))]),
    ala: RL('ALA', TT('Ala', 'Ala'), TT('One against one on the wing: quick feet, short sprints and stamina.', 'El uno contra uno en banda: pies rápidos, sprints cortos y resistencia.'), { AGI: 3.5, SPD: 3, STA: 2.5, PWR: 1.5, CORE: 1.5, STR: 1 }, [
      DR('agility', TT('Sole Control Feet', 'Pies de control con la suela'), TT('Fast lateral footwork for tight spaces.', 'Juego de pies lateral rápido para espacios cortos.')),
      DR('sprint', TT('Short Sprints', 'Sprints cortos'), TT('Five-metre bursts to win the space.', 'Arrancadas de cinco metros para ganar el espacio.')),
      DR('stamina', TT('Pressing Engine', 'Motor de presión'), TT('A circuit for high pressing all match.', 'Un circuito para presionar arriba todo el partido.')),
      DR('core', TT('Turn and Balance', 'Giro y equilibrio'), TT('A steady core for quick turns.', 'Un core firme para girar rápido.'))]),
    pivot: RL('PIV', TT('Pivot', 'Pívot'), TT('Play with your back to goal: strength, power and a solid core.', 'Juega de espaldas a portería: fuerza, potencia y un core sólido.'), { STR: 3.5, PWR: 3, CORE: 2.5, AGI: 1.5, SPD: 1.5, STA: 1.5 }, [
      DR('contact', TT('Back to Goal', 'De espaldas a portería'), TT('Neck, traps and core to hold off defenders.', 'Cuello, trapecios y core para aguantar a los defensas.')),
      DR('power', TT('Turn and Shoot', 'Gira y dispara'), TT('Explosive legs for quick finishes.', 'Piernas explosivas para rematar rápido.')),
      DR('upper', TT('Shielding Strength', 'Fuerza para proteger'), TT('Upper body strength to protect the ball.', 'Fuerza de tren superior para proteger el balón.')),
      DR('lower', TT('Anchor Legs', 'Piernas de ancla'), TT('A base nobody can move.', 'Una base que nadie mueve.'))]) } },
  basketball: { ico: '🏀', name: TT('Basketball', 'Baloncesto'), unit: 'points', roles: {
    guard: RL('GRD', TT('Guard', 'Base'), TT('Run the offence: speed, quick feet and stamina.', 'Dirige el ataque: velocidad, pies rápidos y resistencia.'), { SPD: 3, AGI: 3, STA: 2.5, PWR: 1.5, CORE: 1.5, STR: 1 }, [
      DR('sprint', TT('Fast Break', 'Contraataque'), TT('Sprints to run the floor.', 'Sprints para correr la cancha.')),
      DR('agility', TT('Crossover Feet', 'Pies de crossover'), TT('Lateral work for quick changes of direction.', 'Trabajo lateral para cambios de dirección rápidos.')),
      DR('stamina', TT('Four Quarters', 'Cuatro cuartos'), TT('A bodyweight circuit that lasts the whole game.', 'Un circuito con tu peso que dura todo el partido.')),
      DR('core', TT('Handle and Balance', 'Control y equilibrio'), TT('A steady core to stay balanced on drives.', 'Un core firme para mantener el equilibrio en las penetraciones.'))]),
    forward: RL('FWD', TT('Forward', 'Alero'), TT('Do a bit of everything: power, strength and agility.', 'Haz un poco de todo: potencia, fuerza y agilidad.'), { PWR: 2.5, STR: 2.5, AGI: 2, SPD: 2, STA: 2, CORE: 1.5 }, [
      DR('power', TT('Dunk Power', 'Potencia de mate'), TT('Vertical jumps and explosive legs.', 'Saltos verticales y piernas explosivas.')),
      DR('agility', TT('Wing Moves', 'Movimientos de ala'), TT('Lateral hops to get open on the wing.', 'Saltos laterales para desmarcarte en el ala.')),
      DR('lower', TT('Driving Legs', 'Piernas de penetración'), TT('Strength to finish through contact.', 'Fuerza para acabar con contacto.')),
      DR('throw', TT('Rebound and Pass', 'Rebote y pase'), TT('Explosive throws for outlet passes.', 'Lanzamientos explosivos para pases de salida.'))]),
    center: RL('CTR', TT('Center', 'Pívot'), TT('Own the paint: strength, power and a solid core.', 'Domina la zona: fuerza, potencia y un core sólido.'), { STR: 3.5, PWR: 3, CORE: 2.5, STA: 1.5, AGI: 1, SPD: 1 }, [
      DR('contact', TT('Paint Battles', 'Batallas en la zona'), TT('Neck, traps and core for physical play.', 'Cuello, trapecios y core para el juego físico.')),
      DR('power', TT('Rim Protector', 'Protector del aro'), TT('Jumping power to block shots.', 'Potencia de salto para taponar.')),
      DR('upper', TT('Post Strength', 'Fuerza de poste'), TT('Upper body strength to hold your spot.', 'Fuerza de tren superior para mantener tu posición.')),
      DR('lower', TT('Anchor Legs', 'Piernas de ancla'), TT('A heavy base nobody can move.', 'Una base pesada que nadie mueve.'))]) } },
  tennis: { ico: '🎾', name: TT('Tennis', 'Tenis'), unit: 'sets', roles: {
    baseliner: RL('BSL', TT('Baseliner', 'Fondista'), TT('Win long rallies: stamina, footwork and speed.', 'Gana los peloteos largos: resistencia, juego de pies y velocidad.'), { STA: 3.5, AGI: 3, SPD: 2.5, CORE: 2, STR: 1, PWR: 1 }, [
      DR('stamina', TT('Rally Engine', 'Motor de peloteo'), TT('A long circuit for five-set stamina.', 'Un circuito largo para aguantar cinco sets.')),
      DR('agility', TT('Court Footwork', 'Juego de pies'), TT('Lateral hops and split-step speed.', 'Saltos laterales y velocidad de split-step.')),
      DR('sprint', TT('Drop-Shot Dashes', 'Carreras a la dejada'), TT('Short sprints to the net and back.', 'Sprints cortos a la red y vuelta.')),
      DR('core', TT('Rotation Core', 'Core de rotación'), TT('A core that turns and recovers every shot.', 'Un core que gira y recupera en cada golpe.'))]),
    server: RL('SRV', TT('Big Server', 'Sacador'), TT('Hit big: shoulder power, a strong core and explosive legs.', 'Pega fuerte: potencia de hombros, core fuerte y piernas explosivas.'), { PWR: 3.5, STR: 2.5, CORE: 2.5, AGI: 1.5, SPD: 1.5, STA: 1.5 }, [
      DR('shoulder', TT('Serve Shoulders', 'Hombros de saque'), TT('Strong, healthy shoulders for big serves.', 'Hombros fuertes y sanos para saques potentes.')),
      DR('throw', TT('Serve Power', 'Potencia de saque'), TT('Explosive throws that mimic the serve.', 'Lanzamientos explosivos que imitan el saque.')),
      DR('power', TT('Leg Drive', 'Impulso de piernas'), TT('Jumps to launch into the serve.', 'Saltos para lanzarte al saque.')),
      DR('core', TT('Core Torque', 'Torsión del core'), TT('Rotation strength through the middle.', 'Fuerza de rotación en el centro.'))]) } },
  rugby: { ico: '🏉', name: TT('Rugby', 'Rugby'), unit: 'points', roles: {
    forward: RL('FRW', TT('Rugby Forward', 'Delantero de rugby'), TT('Win the scrum and the breakdown: strength, neck and core.', 'Gana la melé y el ruck: fuerza, cuello y core.'), { STR: 3.5, CORE: 2.5, STA: 2.5, PWR: 2, SPD: 1, AGI: 1 }, [
      DR('contact', TT('Scrum Machine', 'Máquina de melé'), TT('Neck, traps and core for the scrum.', 'Cuello, trapecios y core para la melé.')),
      DR('lower', TT('Scrum Legs', 'Piernas de empuje'), TT('Heavy legs to drive through contact.', 'Piernas fuertes para empujar en el contacto.')),
      DR('upper', TT('Tackle Strength', 'Fuerza de placaje'), TT('Pushing and pulling power for tackles.', 'Fuerza de empuje y tirón para placar.')),
      DR('stamina', TT('Ruck Engine', 'Motor de ruck'), TT('A circuit for 80 minutes of work.', 'Un circuito para 80 minutos de trabajo.'))]),
    back: RL('BCK', TT('Outside Back', 'Tres cuartos'), TT('Break the line: speed, agility and power.', 'Rompe la línea: velocidad, agilidad y potencia.'), { SPD: 3.5, AGI: 3, PWR: 2.5, STA: 1.5, STR: 1.5, CORE: 1 }, [
      DR('sprint', TT('Open-Field Speed', 'Velocidad en campo abierto'), TT('Sprints to outrun the defence.', 'Sprints para dejar atrás a la defensa.')),
      DR('agility', TT('Step and Swerve', 'Quiebro y esquive'), TT('Lateral hops for sidesteps.', 'Saltos laterales para los quiebros.')),
      DR('power', TT('Breakaway Power', 'Potencia de ruptura'), TT('Explosive legs to burst through gaps.', 'Piernas explosivas para romper huecos.')),
      DR('contact', TT('Tackle Prep', 'Preparación de placaje'), TT('Neck and core to stay safe in contact.', 'Cuello y core para estar seguro en el contacto.'))]) } },
  volleyball: { ico: '🏐', name: TT('Volleyball', 'Voleibol'), unit: 'sets', roles: {
    hitter: RL('HIT', TT('Hitter', 'Atacante'), TT('Smash from the air: vertical power, shoulders and core.', 'Remata en el aire: potencia vertical, hombros y core.'), { PWR: 3.5, STR: 2, CORE: 2.5, AGI: 2, SPD: 1.5, STA: 1.5 }, [
      DR('power', TT('Vertical Jump', 'Salto vertical'), TT('Jumps and heavy legs for a higher reach.', 'Saltos y piernas fuertes para llegar más alto.')),
      DR('shoulder', TT('Spike Shoulders', 'Hombros de remate'), TT('Shoulder strength for powerful spikes.', 'Fuerza de hombros para remates potentes.')),
      DR('core', TT('Hang-Time Core', 'Core de suspensión'), TT('A tight core in the air.', 'Un core firme en el aire.')),
      DR('agility', TT('Approach Steps', 'Pasos de aproximación'), TT('Quick feet before the jump.', 'Pies rápidos antes del salto.'))]),
    setter: RL('SET', TT('Setter', 'Colocador'), TT('Control the game: agility, quick hands and balance.', 'Controla el juego: agilidad, manos rápidas y equilibrio.'), { AGI: 3.5, CORE: 2.5, STA: 2, SPD: 2, PWR: 1.5, STR: 1 }, [
      DR('agility', TT('Footwork Setup', 'Juego de pies'), TT('Quick lateral steps to reach every ball.', 'Pasos laterales rápidos para llegar a cada balón.')),
      DR('shoulder', TT('Soft Hands', 'Manos suaves'), TT('Shoulder control for precise sets.', 'Control de hombros para colocaciones precisas.')),
      DR('core', TT('Balanced Base', 'Base equilibrada'), TT('A core that keeps you stable under the ball.', 'Un core que te mantiene estable bajo el balón.')),
      DR('stamina', TT('Long Rallies', 'Rallies largos'), TT('A circuit for long points.', 'Un circuito para puntos largos.'))]),
    libero: RL('LIB', TT('Libero', 'Líbero'), TT('Dig everything: agility, speed and low-body strength.', 'Defiende todo: agilidad, velocidad y fuerza de piernas.'), { AGI: 3.5, SPD: 3, STR: 1.5, CORE: 2, STA: 2, PWR: 1 }, [
      DR('agility', TT('Dig Reactions', 'Reacciones de defensa'), TT('Fast lateral hops to reach the ball.', 'Saltos laterales rápidos para llegar al balón.')),
      DR('sprint', TT('Court Dashes', 'Carreras de pista'), TT('Short sprints to chase every ball.', 'Sprints cortos para perseguir cada balón.')),
      DR('lower', TT('Low Stance Legs', 'Piernas de postura baja'), TT('Leg strength for a deep ready position.', 'Fuerza de piernas para una posición baja.')),
      DR('core', TT('Dive Core', 'Core de plongeon'), TT('A core to dive and get back up.', 'Un core para lanzarte y levantarte.'))]) } },
  running: { ico: '🏃', name: TT('Running', 'Atletismo'), unit: 'place', roles: {
    sprinter: RL('SPR', TT('Sprinter', 'Velocista'), TT('Be first out of the blocks: speed, power and posture.', 'Sal el primero de los tacos: velocidad, potencia y postura.'), { SPD: 4, PWR: 3, STR: 2, CORE: 2, AGI: 1, STA: 1 }, [
      DR('sprint', TT('Block Starts', 'Salidas de tacos'), TT('Short, violent accelerations.', 'Aceleraciones cortas y explosivas.')),
      DR('power', TT('Track Power', 'Potencia de pista'), TT('Jumps for stride power.', 'Saltos para la potencia de zancada.')),
      DR('lower', TT('Sprinter Legs', 'Piernas de velocista'), TT('Heavy legs for a harder push.', 'Piernas fuertes para empujar más.')),
      DR('core', TT('Posture Core', 'Core de postura'), TT('A stiff core to run tall and fast.', 'Un core firme para correr erguido y rápido.'))]),
    middle: RL('MDL', TT('Middle-Distance', 'Mediofondista'), TT('Run fast for a long time: stamina, speed and strength.', 'Corre rápido durante mucho tiempo: resistencia, velocidad y fuerza.'), { STA: 3.5, SPD: 3, STR: 2, CORE: 2, PWR: 1.5, AGI: 1 }, [
      DR('stamina', TT('Interval Engine', 'Motor de intervalos'), TT('A hard circuit to build your engine.', 'Un circuito duro para construir tu motor.')),
      DR('sprint', TT('Final Kick', 'Remate final'), TT('Sprints for the last lap.', 'Sprints para la última vuelta.')),
      DR('lower', TT('Stride Strength', 'Fuerza de zancada'), TT('Leg strength to hold your pace.', 'Fuerza de piernas para mantener el ritmo.')),
      DR('core', TT('Steady Core', 'Core estable'), TT('A core that does not fade late in the race.', 'Un core que no se rinde al final de la carrera.'))]),
    marathon: RL('MAR', TT('Marathoner', 'Maratoniano'), TT('Go the distance: huge stamina and durable legs.', 'Aguanta la distancia: gran resistencia y piernas duraderas.'), { STA: 4.5, STR: 2, CORE: 2.5, SPD: 1.5, PWR: 1, AGI: 1 }, [
      DR('stamina', TT('Long Haul', 'Larga distancia'), TT('A long circuit to build endurance.', 'Un circuito largo para ganar fondo.')),
      DR('stamina', TT('Tempo Circuit', 'Circuito de ritmo'), TT('Steady effort at a hard pace.', 'Esfuerzo constante a ritmo duro.')),
      DR('lower', TT('Durable Legs', 'Piernas duraderas'), TT('Strength so your legs last 42 km.', 'Fuerza para que tus piernas duren 42 km.')),
      DR('core', TT('Form Core', 'Core de técnica'), TT('A strong middle to keep your form late.', 'Un centro fuerte para mantener la técnica al final.'))]) } },
  combat: { ico: '🥊', name: TT('Combat sports', 'Deportes de combate'), unit: 'fight', roles: {
    boxer: RL('BOX', TT('Boxer', 'Boxeador'), TT('Fight all rounds: stamina, quick feet and punching power.', 'Aguanta todos los asaltos: resistencia, pies rápidos y pegada.'), { STA: 3, AGI: 2.5, PWR: 2.5, SPD: 2, CORE: 2, STR: 1.5 }, [
      DR('stamina', TT('Round Engine', 'Motor de asaltos'), TT('A circuit with the rhythm of a fight.', 'Un circuito con el ritmo de un combate.')),
      DR('agility', TT('Footwork and Slips', 'Juego de pies y esquivas'), TT('Lateral hops to move and dodge.', 'Saltos laterales para moverte y esquivar.')),
      DR('throw', TT('Punch Power', 'Potencia de golpeo'), TT('Explosive throws for knockout power.', 'Lanzamientos explosivos para la pegada.')),
      DR('core', TT('Iron Core', 'Core de hierro'), TT('A core that takes a punch.', 'Un core que aguanta un golpe.'))]),
    grappler: RL('GRP', TT('Grappler', 'Luchador'), TT('Control the mat: grip, strength and a rock-solid core.', 'Domina el tatami: agarre, fuerza y un core firme.'), { STR: 3.5, CORE: 3, STA: 2.5, PWR: 2, AGI: 1.5, SPD: 1 }, [
      DR('contact', TT('Grip and Neck', 'Agarre y cuello'), TT('Neck and trap strength for the clinch.', 'Fuerza de cuello y trapecios para el clinch.')),
      DR('upper', TT('Pulling Power', 'Fuerza de tirón'), TT('Back and arm strength to pull opponents.', 'Fuerza de espalda y brazos para arrastrar rivales.')),
      DR('core', TT('Base and Balance', 'Base y equilibrio'), TT('A core that cannot be taken down.', 'Un core al que no pueden derribar.')),
      DR('stamina', TT('Round Endurance', 'Resistencia de asaltos'), TT('A circuit for long rounds.', 'Un circuito para asaltos largos.'))]) } },
};
const DRILL_LV = [1, 1, 3, 5], DRILL_MULT = [1.25, 1.25, 1.4, 1.6];
const roleOf = key => { const [s, r] = key.split('/'); return SPORTS[s]?.roles[r]; };

// ---------- state ----------
const SP = Object.assign({ cur: null, pts: {}, roles: {}, claimed: [], seeded: false }, load('sport', {}));
const spSave = () => save('sport', SP);
const roleState = key => SP.roles[key] || (SP.roles[key] = { sxp: 0, drills: 0, w: 0, d: 0, l: 0, match: null });
const statVal = a => Math.round(30 + 69 * (1 - Math.exp(-(SP.pts[a] || 0) / 700)));
const ovrOf = role => { const tot = SATTRS.reduce((a, k) => a + role.w[k], 0); return Math.round(SATTRS.reduce((a, k) => a + role.w[k] * statVal(k), 0) / tot); };
const CAREER = [[0, TT('Amateur', 'Aficionado')], [45, TT('Academy', 'Cantera')], [55, TT('Semi-Pro', 'Semiprofesional')], [65, TT('Pro', 'Profesional')], [75, TT('Star', 'Estrella')], [85, TT('World Class', 'Clase mundial')], [93, TT('Legend', 'Leyenda')]];
const careerTier = ovr => CAREER.filter(t => ovr >= t[0]).at(-1)[1];
const cardClass = ovr => ovr >= 93 ? 'icon' : ovr >= 75 ? 'gold' : ovr >= 55 ? 'silver' : 'bronze';
const sportLevel = sxp => 1 + Math.floor(Math.sqrt(sxp / 120));
const sportLvXp = lv => (lv - 1) ** 2 * 120;
const MILES = [[50, 'wood', 60], [60, 'silver', 100], [70, 'silver', 150], [80, 'gold', 250], [90, 'gold', 400]];
const weekDrills = sport => S.history.filter(h => h.sport && h.sport.key.startsWith(sport + '/') && weekId(h.t) === weekId()).length;

// Everyday workouts raise the attributes a little, so all your training counts.
function generalGains(h) {
  const g = {}, add = (k, v) => { g[k] = (g[k] || 0) + v; };
  h.ex.forEach(x => {
    const e = BY[x.id]; if (!e) return; const n = x.sets.length, m = e.m[0];
    if (e.c === 'plyometrics') { add('SPD', .5 * n); add('AGI', .5 * n); add('PWR', .6 * n); }
    else if (['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(m)) { add('STR', .8 * n); add('PWR', .3 * n); }
    else if (['abdominals', 'lower back'].includes(m)) add('CORE', .8 * n);
    else add('STR', .6 * n);
  });
  add('STA', (h.dur || 0) * .35);
  for (const k in g) g[k] = Math.min(30, g[k]);
  return g;
}
function seedStats(skip) {
  if (SP.seeded || !S.profile) return;
  const base = { beginner: 60, intermediate: 260, expert: 520 }[S.profile.level] ?? 60;
  SATTRS.forEach(k => { SP.pts[k] = base; });
  S.history.forEach(h => { if (!h.sport && h !== skip) { const g = generalGains(h); for (const k in g) SP.pts[k] += g[k]; } });
  SP.seeded = true; spSave();
}
const addPts = g => { for (const k in g) SP.pts[k] = (SP.pts[k] || 0) + g[k]; };

// ---------- building a drill ----------
function buildDrill(key, i) {
  const role = roleOf(key), d = role.drills[i], K = KINDS[d.kind], p = S.profile, r = rng((Date.now() >>> 4) & 0xffffff), used = new Set(), items = [];
  const have = K.bw ? new Set(['body only', 'none']) : equipSet(p);
  const base = EX.filter(e => ['strength', 'plyometrics', 'powerlifting', 'olympic weightlifting', 'strongman'].includes(e.c) && allowed(e, p, have));
  const add = e => { used.add(e.id); items.push({ id: e.id, sets: K.sets, reps: K.reps, rest: K.rest }); };
  for (const s of K.slots) {
    const c = shuffle(base.filter(e => !used.has(e.id) && (!s.c || s.c.includes(e.c)) && (!s.m || s.m.includes(e.m[0])) && (!s.re || s.re.test(e.n.toLowerCase()))), r);
    if (c.length) add(c[0]);
  }
  if (items.length < 4) {
    const mus = DRILL_MUSCLES[d.kind] || ['quadriceps', 'abdominals', 'chest', 'lats'];
    shuffle(base.filter(e => !used.has(e.id) && mus.includes(e.m[0])), r).slice(0, 5 - items.length).forEach(add);
  }
  return items;
}
window.startDrill = i => {
  const key = SP.cur, role = roleOf(key); if (!role) return;
  if (sportLevel(roleState(key).sxp) < DRILL_LV[i]) return;
  const items = buildDrill(key, i);
  if (items.length < 3) { toast('Not enough exercises match your equipment and limits.'); return; }
  startSession(role.drills[i].name, items, { sport: { key, i, plan: items.reduce((a, x) => a + x.sets, 0) } });
};

// ---------- finishing: hooks ----------
let PEND = null;
const _spFin = window.finish;
window.finish = () => { PEND = session?.sport || null; _spFin(); PEND = null; };
const _spGw = gameWorkout;
gameWorkout = function (h) {
  const sp = PEND; PEND = null;
  _spGw(h);
  try { seedStats(h); sportAfter(h, sp); } catch (err) { console.error(err); }
};
function sportAfter(h, sp) {
  if (!sp) { addPts(generalGains(h)); checkMilestones(); spSave(); return; }
  const role = roleOf(sp.key), d = role.drills[sp.i], K = KINDS[d.kind], done = h.ex.reduce((a, x) => a + x.sets.length, 0), q = Math.max(.3, Math.min(1, done / sp.plan)), rs = roleState(sp.key);
  h.sport = { key: sp.key, i: sp.i }; save('history', S.history);
  const gains = {}; for (const k in K.gains) gains[k] = Math.round(K.gains[k] * q);
  addPts(gains); rs.sxp += Math.round(100 * q); rs.drills++;
  ensureDay(); G.today.drills = (G.today.drills || 0) + 1;
  const mult = DRILL_MULT[sp.i], bonus = Math.round(LAST.xp * (mult - 1)), coins = Math.round(bonus / 6);
  award(bonus, coins);
  LAST.lines.push([`Sport drill ×${mult}`, bonus], [Object.entries(gains).map(([k, v]) => `${ATTR[k][0]} +${v}`).join(' · '), null]);
  LAST.xp += bonus; LAST.coins += coins; LAST.after = G.xp;
  const lv0 = sportLevel(rs.sxp - Math.round(100 * q)), lv1 = sportLevel(rs.sxp);
  if (lv1 > lv0) toast(`Career level ${lv1}`);
  checkMilestones();
  const more = checkAch(); if (more.length) LAST.ach.push(...more);
  spSave(); commit();
}
function checkMilestones() {
  const role = SP.cur && roleOf(SP.cur); if (!role) return;
  const ovr = ovrOf(role);
  MILES.forEach(([m, chest, coins]) => {
    if (ovr >= m && !SP.claimed.includes(m)) { SP.claimed.push(m); G.chests.push(chest); award(coins, coins); toast(`Career milestone! OVR ${m}: ${coins} coins and a chest`); sfx('claim'); }
  });
}

// ---------- achievements and quest ----------
const bestOvr = () => Math.max(0, ...Object.keys(SPORTS).flatMap(s => Object.keys(SPORTS[s].roles).map(r => ovrOf(SPORTS[s].roles[r]))));
const wins = () => Object.values(SP.roles).reduce((a, r) => a + r.w, 0), allDrills = () => S.history.filter(h => h.sport).length;
ACH.push(
  { id: 'sp1', n: TT('Pick a Side', 'Elige tu bando'), d: TT('Finish your first sport drill', 'Termina tu primer ejercicio de deporte'), i: 'target', xp: 80, ok: () => allDrills() >= 1 },
  { id: 'sp10', t: TT('Drill Sergeant', 'Sargento de entrenamiento'), n: TT('Training Camp', 'Concentración'), d: TT('Finish 10 sport drills', 'Termina 10 ejercicios de deporte'), i: 'centurion', xp: 250, ok: () => allDrills() >= 10 },
  { id: 'ovr60', n: TT('Semi-Pro', 'Semiprofesional'), d: TT('Reach an overall rating of 60', 'Alcanza una valoración general de 60'), i: 'medal', xp: 200, ok: () => SP.seeded && bestOvr() >= 60 },
  { id: 'ovr75', t: TT('Star Player', 'Jugador estrella'), n: TT('Star Player', 'Jugador estrella'), d: TT('Reach an overall rating of 75', 'Alcanza una valoración general de 75'), i: 'trophy', xp: 400, ok: () => SP.seeded && bestOvr() >= 75 },
  { id: 'ovr90', t: TT('World Class', 'Clase mundial'), n: TT('World Class', 'Clase mundial'), d: TT('Reach an overall rating of 90', 'Alcanza una valoración general de 90'), i: 'crown', xp: 800, ok: () => SP.seeded && bestOvr() >= 90 },
  { id: 'win1', n: TT('First Win', 'Primera victoria'), d: TT('Win a weekly match', 'Gana un partido semanal'), i: 'laurel', xp: 120, ok: () => wins() >= 1 },
  { id: 'win5', t: TT('Match Winner', 'Ganador de partidos'), n: TT('Five Wins', 'Cinco victorias'), d: TT('Win 5 weekly matches', 'Gana 5 partidos semanales'), i: 'shield', xp: 350, ok: () => wins() >= 5 },
);
QT.push({ id: 'drill', t: TT('Do a sport drill', 'Haz un ejercicio de deporte'), n: 1, m: 'drills', xp: 90, ico: 'sprint', need: () => !!SP.cur });

// ---------- weekly match ----------
const TEAMS = { a: ['Northgate', 'Red Harbor', 'Ironvale', 'Silver Creek', 'Port Alba', 'Stonebridge', 'Eastfield', 'Blackwater'], b: ['Wolves', 'Hawks', 'Rovers', 'Titans', 'Falcons', 'Giants', 'Storm', 'Kings'] };
const RIVALS = ['Dante Silva', 'Kai Larsen', 'Mateo Ruiz', 'Yuki Tanaka', 'Omar Haddad', 'Luca Ferri', 'Ivan Petrov', 'Noah Clarke'];
const pickOf = (a, r) => a[Math.floor(r() * a.length)];
function opponentFor(key, ovr) {
  const r = rng(hash(weekId() + key)), rs = roleState(key), sport = key.split('/')[0];
  const target = Math.round(.5 * ovr + .5 * (42 + 4 * (rs.w + rs.d / 2)) + (r() - .5) * 10), opp = Math.max(38, Math.min(95, target));
  const name = ['running', 'combat', 'tennis'].includes(sport) ? pickOf(RIVALS, r) : `${pickOf(TEAMS.a, r)} ${pickOf(TEAMS.b, r)}`;
  return { name, ovr: opp };
}
function scoreFor(sport, res, r) {
  const W = res === 'W', D = res === 'D', pick = (a, b) => a + Math.floor(r() * (b - a + 1));
  let a, b, text;
  if (sport === 'futsal') { if (D) a = b = pick(1, 4); else { const hi = pick(2, 6), lo = Math.floor(r() * hi); a = W ? hi : lo; b = W ? lo : hi; } }
  else if (sport === 'football') { if (D) a = b = pick(0, 2); else { const hi = pick(1, 3), lo = Math.floor(r() * hi); a = W ? hi : lo; b = W ? lo : hi; } }
  else if (sport === 'basketball') { const hi = pick(82, 108), lo = hi - pick(2, 14); a = W ? hi : lo; b = W ? lo : hi; }
  else if (sport === 'rugby') { if (D) a = b = pick(10, 24); else { const hi = pick(17, 36), lo = hi - pick(3, 14); a = W ? hi : lo; b = W ? lo : hi; } }
  else if (sport === 'volleyball') { const lo = pick(0, 2); a = W ? 3 : lo; b = W ? lo : 3; }
  else if (sport === 'tennis') { const lo = pick(0, 1); a = W ? 2 : lo; b = W ? lo : 2; }
  else if (sport === 'running') { const place = W ? 1 : D ? pick(2, 3) : pick(4, 8); text = `Finished position ${place} of 8`; }
  else { text = W ? (r() < .5 ? 'Won by KO' : 'Won on points') : D ? 'Draw on the cards' : (r() < .5 ? 'Lost on points' : `Stopped in round ${pick(2, 8)}`); }
  return { a, b, text };
}
const NOTE = {
  W: { SPD: TT('Your pace decided it.', 'Tu ritmo lo decidió.'), PWR: TT('Your power decided it.', 'Tu potencia lo decidió.'), STA: TT('Your stamina decided it.', 'Tu resistencia lo decidió.'), AGI: TT('Your agility decided it.', 'Tu agilidad lo decidió.'), STR: TT('Your strength decided it.', 'Tu fuerza lo decidió.'), CORE: TT('Your balance decided it.', 'Tu equilibrio lo decidió.') },
  L: { SPD: TT('Lack of pace cost you. Train speed!', 'La falta de ritmo te costó caro. ¡Entrena velocidad!'), PWR: TT('Lack of power cost you. Train power!', 'La falta de potencia te costó caro. ¡Entrena potencia!'), STA: TT('You ran out of stamina. Train it!', 'Te quedaste sin resistencia. ¡Entrénala!'), AGI: TT('Lack of agility cost you. Train it!', 'La falta de agilidad te costó caro. ¡Entrénala!'), STR: TT('Lack of strength cost you. Train it!', 'La falta de fuerza te costó caro. ¡Entrénala!'), CORE: TT('Your balance let you down. Train your core!', 'Tu equilibrio te falló. ¡Entrena el core!') },
};
window.playMatch = () => {
  const key = SP.cur, role = roleOf(key); if (!role) return;
  const rs = roleState(key), sport = key.split('/')[0];
  if (rs.match?.week === weekId() || weekDrills(sport) < 2) return;
  const ovr = ovrOf(role), opp = opponentFor(key, ovr), r = rng(hash('m' + weekId() + key));
  const p = Math.max(.08, Math.min(.92, .5 + (ovr - opp.ovr) / 50 + .04 * (weekDrills(sport) - 2))), draw = ['football', 'futsal', 'rugby', 'running', 'combat'].includes(sport) ? .14 : 0;
  const roll = r(), pw = Math.max(.04, p - draw / 2), res = roll < pw ? 'W' : roll < pw + draw ? 'D' : 'L';
  const sc = scoreFor(sport, res, r), ranked = SATTRS.slice().sort((x, y) => role.w[y] * statVal(y) - role.w[x] * statVal(x)), weak = SATTRS.slice().sort((x, y) => statVal(x) / role.w[x] - statVal(y) / role.w[y]);
  const rew = { W: [200, 120, 80], D: [80, 50, 40], L: [40, 20, 30] }[res];
  rs.match = { week: weekId(), res, opp: opp.name, oppOvr: opp.ovr, a: sc.a, b: sc.b, text: sc.text, note: res === 'L' ? NOTE.L[weak[0]] : NOTE.W[ranked[0]], xp: rew[0], coins: rew[1] };
  rs[res.toLowerCase()]++; rs.sxp += rew[2];
  if (res === 'W') G.chests.push('silver');
  award(rew[0], rew[1]); sfx('claim'); if (res === 'W') confetti();
  checkAch(); spSave(); flushLevelUp(route);
};

// ---------- views ----------
const attrBar = k => `<div class="pcs"><b style="color:${ATTR[k][1]}">${statVal(k)}</b><span>${k}</span><i><u style="width:${statVal(k)}%;background:${ATTR[k][1]}"></u></i></div>`;
function playerCard(key) {
  const role = roleOf(key), sport = SPORTS[key.split('/')[0]], ovr = ovrOf(role);
  return `<section class="pcard pc-${cardClass(ovr)}"><div class="pc-head"><div class="pc-ovr"><b>${ovr}</b><span>OVR</span><i>${role.pos}</i><em>${sport.ico}</em></div>
  <div class="pc-av fr-${G.frame}">${gi(G.avatar, 'hero')}</div><div class="pc-name"><b>${esc(S.profile.name || 'Player')}</b><span>${role.name} · ${careerTier(ovr)}</span></div></div>
  <div class="pc-stats">${SATTRS.map(attrBar).join('')}</div></section>`;
}
function sportPicker(arg) {
  if (arg && SPORTS[arg]) {
    const sp = SPORTS[arg];
    view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button><h1>${sp.ico} ${sp.name}</h1><p class="mut">Pick your position</p>
    ${Object.entries(sp.roles).map(([id, r]) => `<section class="card tap" onclick="chooseRole('${arg}/${id}')"><div class="row between"><h3>${r.name}</h3><span class="chip on">${r.pos}</span></div><div class="mut">${r.desc}</div>
    <div class="chips static">${SATTRS.slice().sort((x, y) => r.w[y] - r.w[x]).slice(0, 3).map(k => `<span class="chip">${ATTR[k][0]}</span>`).join('')}</div></section>`).join('')}`;
    return;
  }
  view.innerHTML = `<h1>Sports Academy</h1><p class="mut">Choose a sport and a position. Train like a pro, build a player card and play a match every week.</p>
  <div class="two">${Object.entries(SPORTS).map(([id, s]) => `<section class="card tap sp-tile" onclick="location.hash='#/sport/${id}'"><div class="sp-ico">${s.ico}</div><b>${s.name}</b><span class="mut">${Object.keys(s.roles).length} positions</span></section>`).join('')}</div>`;
}
window.chooseRole = key => { SP.cur = key; roleState(key); seedStats(); checkMilestones(); spSave(); location.hash = '#/sport'; };
window.changeSport = () => { SP.cur = null; spSave(); location.hash = '#/sport'; };
window.changeRole = () => { location.hash = '#/sport/' + SP.cur.split('/')[0]; };

function sportView(arg) {
  if (needProfile()) return;
  seedStats();
  if (arg === 'pick' || !SP.cur || (arg && SPORTS[arg])) { sportPicker(arg === 'pick' ? null : arg); return; }
  const key = SP.cur, role = roleOf(key), sport = key.split('/')[0], rs = roleState(key), lv = sportLevel(rs.sxp), a = sportLvXp(lv), b = sportLvXp(lv + 1), ovr = ovrOf(role);
  const wk = weekDrills(sport), m = rs.match?.week === weekId() ? rs.match : null, opp = opponentFor(key, ovr);
  const resTxt = { W: TT('Victory', 'Victoria'), D: TT('Draw', 'Empate'), L: TT('Defeat', 'Derrota') };
  view.innerHTML = `<h1>Sports Academy</h1>${playerCard(key)}
  <section class="card"><div class="row between"><b>Career level ${lv}</b><span class="mut">${rs.sxp - a} / ${b - a} career XP</span></div><div class="xpbar"><i style="width:${(rs.sxp - a) / (b - a) * 100}%"></i></div>
  <div class="row" style="margin-top:10px"><button class="btn sm ghost" onclick="changeRole()">Change position</button><button class="btn sm ghost" onclick="changeSport()">Change sport</button></div></section>
  <h2 class="sec">Match day</h2>
  <section class="card match">${m ? `<div class="row between"><h3>${resTxt[m.res]}</h3><span class="mut">vs ${esc(m.opp)} · OVR ${m.oppOvr}</span></div>
    <div class="score">${m.text ? esc(m.text) : `${m.a}–${m.b}`}</div><div class="mut">${m.note}</div><div class="mut" style="margin-top:6px">Match reward: +${m.xp} XP · +${m.coins} coins</div>`
    : `<div class="row between"><h3>${esc(opp.name)}</h3><span class="mut">OVR ${opp.ovr}</span></div><div class="mut">Drills this week: ${Math.min(wk, 2)}/2</div>
    ${wk >= 2 ? `<button class="btn" onclick="playMatch()" style="margin-top:10px">Play match</button>` : `<div class="mut" style="margin-top:6px">Do 2 drills in a week to play the match.</div>`}`}
  <div class="chips static" style="margin-top:10px"><span class="chip">W ${rs.w}</span><span class="chip">D ${rs.d}</span><span class="chip">L ${rs.l}</span></div></section>
  <h2 class="sec">Drills</h2>
  ${role.drills.map((d, i) => {
    const ok = lv >= DRILL_LV[i], K = KINDS[d.kind], top = Object.entries(K.gains).sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]);
    return `<section class="card dg ${ok ? '' : 'locked'}"><div class="dgi">${gi(ok ? ({ sprint: 'sprint', power: 'bolt', agility: 'shoe', stamina: 'infinity', lower: 'leg', upper: 'strong', core: 'abs', contact: 'chestplate', throw: 'punch', shoulder: 'shoulder' }[d.kind]) : 'lock')}</div>
    <div class="grow"><h3>${d.name}</h3><div class="mut">${d.desc}</div><div class="chips static"><span class="chip">${DRILL_MULT[i]}× XP</span>${top.map(k => `<span class="chip">${ATTR[k][0]}</span>`).join('')}</div></div>
    ${ok ? `<button class="btn sm" onclick="startDrill(${i})">Train</button>` : `<span class="mut cost">${gi('lock')} Career level ${DRILL_LV[i]}</span>`}</section>`;
  }).join('')}
  <h2 class="sec">Milestones</h2>
  <div class="chips static">${MILES.map(([n]) => `<span class="chip ${SP.claimed.includes(n) ? 'on' : ''}">OVR ${n}</span>`).join('')}</div>
  <p class="mut">Everyday workouts raise your attributes a little too. Reach each rating to open a chest.</p>`;
}

function sportRow() {
  if (!SP.cur) return `<section class="card tap row sp-row" onclick="location.hash='#/sport'"><div class="sp-ico">⚽🥅🏀</div><div class="grow"><h3>Sports Academy</h3><div class="mut">Pick your sport</div></div></section>`;
  const role = roleOf(SP.cur), ovr = ovrOf(role), sport = SPORTS[SP.cur.split('/')[0]];
  return `<section class="card tap row sp-row" onclick="location.hash='#/sport'"><div class="pc-mini pc-${cardClass(ovr)}"><b>${ovr}</b><i>${role.pos}</i></div><div class="grow"><h3>${sport.ico} ${role.name}</h3><div class="mut">${careerTier(ovr)} · Career level ${sportLevel(roleState(SP.cur).sxp)}</div></div><span class="chip on">Train</span></section>`;
}
const _spHome = home;
home = function () { _spHome(); const hud = view.querySelector('.hud'); if (hud && S.profile) { seedStats(); hud.insertAdjacentHTML('afterend', sportRow()); } };
const _spMe = me;
me = function () { _spMe(); if (SP.cur && S.profile) { seedStats(); view.querySelector('.hud')?.insertAdjacentHTML('afterend', playerCard(SP.cur) + `<button class="btn ghost" onclick="location.hash='#/sport'">Open Sports Academy</button>`); } };
Object.assign(routes, { home, me, sport: sportView });

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Sports Academy': 'Academia deportiva', 'Pick your sport': 'Elige tu deporte', 'Pick your position': 'Elige tu posición',
    'Choose a sport and a position. Train like a pro, build a player card and play a match every week.': 'Elige un deporte y una posición. Entrena como un profesional, crea tu carta de jugador y juega un partido cada semana.',
    '{n} positions': '{n} posiciones', 'Career level {n}': 'Nivel de carrera {n}', '{n} / {n} career XP': '{n} / {n} XP de carrera', 'Change position': 'Cambiar posición', 'Change sport': 'Cambiar deporte',
    'Match day': 'Día de partido', 'Drills this week: {n}/{n}': 'Ejercicios esta semana: {n}/{n}', 'Do {n} drills in a week to play the match.': 'Haz {n} ejercicios en una semana para jugar el partido.', 'Play match': 'Jugar partido',
    'Match reward: {n} XP': 'Premio del partido: {n} XP', 'W {n}': 'G {n}', 'D {n}': 'E {n}', 'L {n}': 'P {n}', Drills: 'Ejercicios', Milestones: 'Hitos', Train: 'Entrenar',
    'OVR {n}': 'OVR {n}', 'Everyday workouts raise your attributes a little too. Reach each rating to open a chest.': 'Tus entrenamientos normales también suben un poco tus atributos. Alcanza cada valoración para abrir un cofre.',
    'Open Sports Academy': 'Abrir Academia deportiva', 'Not enough exercises match your equipment and limits.': 'No hay suficientes ejercicios para tu material y tus límites.',
    'Sport drill ×{n}': 'Ejercicio de deporte ×{n}', 'Finished position {n} of 8': 'Terminaste en el puesto {n} de 8', 'Won by KO': 'Victoria por KO', 'Won on points': 'Victoria por puntos', 'Draw on the cards': 'Empate en las tarjetas',
    'Lost on points': 'Derrota por puntos', 'Stopped in round {n}': 'Detenido en el asalto {n}', 'Career milestone! OVR {n}: {n} coins and a chest': '¡Hito de carrera! OVR {n}: {n} monedas y un cofre',
    'Speed {n}': 'Velocidad {n}', 'Power {n}': 'Potencia {n}', 'Stamina {n}': 'Resistencia {n}', 'Agility {n}': 'Agilidad {n}', 'Strength {n}': 'Fuerza {n}', 'Core {n}': 'Core {n}',
  });
}
