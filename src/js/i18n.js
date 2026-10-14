/* ---------- i18n ---------- */
const STR = {
  en: {
    eyebrow:'A game of one lamp',
    tag:'Ships that see your light find the harbor. Ships left in the dark find the rocks.',
    how:'Move the mouse or hold <span class="key">&larr;</span> <span class="key">&rarr;</span> to turn the beam. Keep every ship in the light until it passes the breakwater gate. Each dawn, pick one improvement for the lamp.',
    howTouch:'Drag anywhere: the beam follows your finger. Keep your finger near the lighthouse so the ships stay visible. Each dawn, pick one improvement for the lamp.',
    best:'Best', bestNight:'Longest watch', start:'Light the lamp', resumeRun:'Resume the watch, night', sound:'Sound on', soundOff:'Sound off', fullscreen:'Fullscreen',
    paused:'Lamp held still', pauseHow:'Press P or Esc to resume.', resume:'Resume',
    overEyebrow:'Morning comes', over:'The lamp has gone out', score:'Score', saved:'Brought home', nights:'Nights', again:'Light it again',
    dawnEyebrow:'Dawn', dawn:'The dawn market', dawnHow:'Buy what the oil allows. Press 1 to 4 to buy, Enter to sail on.', level:'Level', newLevel:'New', cont:'Sail on', oil:'oil', bought:'Bought', undo:'Bought \u00b7 click to undo', quit:'Abandon the watch', menu:'Main menu',
    rep:'Reputation', repGain:'Reputation earned', fleetBtn:'The ships', fleetEyebrow:'The fleet', fleetTitle:'The ships of these waters', fromNight:'from night', pts:'pts', logBtn:"Keeper's log", logEyebrow:"Keeper's log", log:'Lasting improvements', logHow:'Bought with reputation, earned at the end of every watch. They stay with you.', back:'Back', owned:'Owned',
    m_glass:'Thicker glass', md_glass:'Start every watch with a fourth lamp.',
    m_veteran:'Veteran keeper', md_veteran:'Start every watch with 4 more oil.',
    m_wick:'Better wick', md_wick:'The beam is 8% wider, for good.',
    m_charts:'Charts of the coast', md_charts:'The first night has one rock fewer.',
    m_keeper:'Hire the harbor keeper', md_keeper:'The harbor lamp is lit from the first night.',
    m_salvage:'Salvage rights', md_salvage:'A lost ship still pays 1 oil.',
    m_crews:'Known waters', md_crews:'Ships in the dark wander 15% less, always.',
    m_merchant:'Dawn merchant', md_merchant:'Four cards at every dawn instead of three.',
    night:'Night', clean:'Clean passage', wreck:'Wrecked', plundered:'Plundered', relit:'Lamp relit', newBest:'New best. The coast remembers you.',
    note1:'One night. Not every keeper makes it past the first.', noteN:'nights kept. The harbor lights stayed on because of you.',
    drift:'drift', ships:'ships', streak:'streak', pirates:'pirates', hint:'Sweep the beam across a ship to guide it',
    w_calm:'Calm sea', w_storm:'Storm', w_fog:'Fog',
    fc_first:'Keep every ship in the light.', fc_calm:'A quiet night. Enjoy it.',
    fc_storm:'Gusts push the ships off course. Lightning shows them the way, for a moment.',
    fc_fog:'The beam reaches only so far. Bring them in close.',
    fc_debris:'Wrecks adrift. They move with the current.',
    fc_pirates:'Pirates in these waters. They show only in the light, and they fear it.',
    s_skiff:'Fishing skiff', s_sloop:'Sloop', s_steamer:'Steamer', s_ferry:'Ferry', s_clipper:'Clipper', s_tanker:'Tanker', s_barge:'Oil barge', s_pirate:'Pirate',
    f_skiff:'quick, nimble', f_sloop:'the current takes it', f_steamer:'slow to turn', f_ferry:'steady, well lit', f_clipper:'fast, drifts far', f_tanker:'turns like a planet', f_barge:'slow, full of oil', f_pirate:'seen only in the light',
    u_wide:'Wider beam', d_wide:'The cone of light opens 15% wider.',
    u_reach:'Longer reach', d_reach:'The light carries 12% farther, fog included.',
    u_turn:'Oiled bearings', d_turn:'The lamp turns 20% faster.',
    u_bright:'Brighter lamp', d_bright:'Lit ships answer the helm 20% quicker.',
    u_lamp:'Spare lamp', d_lamp:'One more lamp to lose, and it is lit now.',
    u_keeper:'Harbor keeper', d_keeper:'A keeper on the mole turns his own lamp onto the nearest ship.', d_keeper2:'His lamp reaches farther and turns faster.', d_keeper3:'A second keeper takes the other mole.',
    u_calm:'Steady crews', d_calm:'Ships in the dark wander 25% less.',
    u_wick:'Fine wick', d_wick:'The streak multiplier grows every 2 ships instead of 3.',
    u_scan:'Scanner beam', d_scan:'A second, blue beam sweeps on its own. It reveals pirates and lures them away from the lighthouse.', d_scan2:'The scanner turns faster and wider.', d_scan3:'A second scanner, opposite the first.',
    u_tide:'Tide tables', d_tide:'The current pushes ships 25% less.',
    u_mirror:'Back mirror', d_mirror:'A dimmer beam shines out the back of the lamp, opposite the main one, with 70% of its reach.',
    u_cranes:'Dock cranes', d_cranes:'Every ship brought home pays 1 more oil.',
    u_watch:'Night watch', d_watch:'Pirates caught in the light give up twice as fast.'
  },
  pl: {
    eyebrow:'Gra o jednej lampie',
    tag:'Statki, które widzą twoje światło, trafiają do portu. Statki zostawione w ciemności trafiają na skały.',
    how:'Ruszaj myszą lub przytrzymaj <span class="key">&larr;</span> <span class="key">&rarr;</span>, aby obracać snop światła. Trzymaj każdy statek w świetle, aż minie bramę falochronu. O każdym świcie wybierz jedno ulepszenie lampy.',
    howTouch:'Przeciągaj gdziekolwiek: snop podąża za palcem. Trzymaj palec blisko latarni, żeby statki pozostały widoczne. O każdym świcie wybierz jedno ulepszenie lampy.',
    best:'Rekord', bestNight:'Najdłuższa warta', start:'Zapal lampę', resumeRun:'Wznów wartę, noc', sound:'Dźwięk wł.', soundOff:'Dźwięk wył.', fullscreen:'Pełny ekran',
    paused:'Lampa zatrzymana', pauseHow:'Wciśnij P lub Esc, aby wrócić.', resume:'Wznów',
    overEyebrow:'Nadchodzi świt', over:'Lampa zgasła', score:'Punkty', saved:'W porcie', nights:'Nocy', again:'Zapal ponownie',
    dawnEyebrow:'Świt', dawn:'Targ o świcie', dawnHow:'Kupuj, na ile starczy oliwy. 1-4 kupuje, Enter zaczyna noc.', level:'Poziom', newLevel:'Nowe', cont:'Zacznij noc', oil:'oliwa', bought:'Kupione', undo:'Kupione \u00b7 kliknij, by cofnąć', quit:'Porzuć wartę', menu:'Menu główne',
    rep:'Reputacja', repGain:'Zdobyta reputacja', fleetBtn:'Statki', fleetEyebrow:'Flota', fleetTitle:'Statki tych wód', fromNight:'od nocy', pts:'pkt', logBtn:'Dziennik latarnika', logEyebrow:'Dziennik latarnika', log:'Trwałe ulepszenia', logHow:'Kupowane za reputację zdobywaną na koniec każdej warty. Zostają na zawsze.', back:'Wróć', owned:'Posiadane',
    m_glass:'Grubsze szkło', md_glass:'Każdą wartę zaczynasz z czwartą lampą.',
    m_veteran:'Doświadczony latarnik', md_veteran:'Każdą wartę zaczynasz z 4 oliwy więcej.',
    m_wick:'Lepszy knot', md_wick:'Snop jest na stałe o 8% szerszy.',
    m_charts:'Mapy wybrzeża', md_charts:'Pierwsza noc ma o jedną skałę mniej.',
    m_keeper:'Zatrudnij latarnika portowego', md_keeper:'Lampa portowa świeci od pierwszej nocy.',
    m_salvage:'Prawo do wraków', md_salvage:'Stracony statek i tak daje 1 oliwy.',
    m_crews:'Znane wody', md_crews:'Statki w ciemności zawsze błądzą o 15% mniej.',
    m_merchant:'Kupiec o świcie', md_merchant:'Cztery karty o każdym świcie zamiast trzech.',
    night:'Noc', clean:'Czysty kurs', wreck:'Rozbity', plundered:'Splądrowany', relit:'Lampa zapalona na nowo', newBest:'Nowy rekord. Wybrzeże cię zapamięta.',
    note1:'Jedna noc. Nie każdy latarnik przetrwa pierwszą.', noteN:'nocy na posterunku. Światła portu paliły się dzięki tobie.',
    drift:'prąd', ships:'statki', streak:'seria', pirates:'piraci', hint:'Przesuń snop po statku, aby go poprowadzić',
    w_calm:'Spokojne morze', w_storm:'Sztorm', w_fog:'Mgła',
    fc_first:'Trzymaj każdy statek w świetle.', fc_calm:'Spokojna noc. Odetchnij.',
    fc_storm:'Porywy spychają statki z kursu. Błyskawica na chwilę pokazuje im drogę.',
    fc_fog:'Snop sięga tylko do pewnej odległości. Prowadź je blisko.',
    fc_debris:'Dryfujące wraki. Poruszają się z prądem.',
    fc_pirates:'Piraci na tych wodach. Widać ich tylko w świetle i boją się go.',
    s_skiff:'Kuter', s_sloop:'Żaglówka', s_steamer:'Parowiec', s_ferry:'Prom', s_clipper:'Kliper', s_tanker:'Tankowiec', s_barge:'Barka z oliwą', s_pirate:'Pirat',
    f_skiff:'szybki, zwinny', f_sloop:'prąd ją znosi', f_steamer:'skręca wolno', f_ferry:'stateczny, dobrze oświetlony', f_clipper:'szybki, daleko znosi', f_tanker:'skręca jak planeta', f_barge:'wolna, pełna oliwy', f_pirate:'widać tylko w świetle',
    u_wide:'Szerszy snop', d_wide:'Stożek światła otwiera się o 15% szerzej.',
    u_reach:'Dłuższy zasięg', d_reach:'Światło sięga 12% dalej, także we mgle.',
    u_turn:'Naoliwione łożyska', d_turn:'Lampa obraca się 20% szybciej.',
    u_bright:'Jaśniejsza lampa', d_bright:'Oświetlone statki skręcają 20% szybciej.',
    u_lamp:'Zapasowa lampa', d_lamp:'Jedna lampa więcej do stracenia, zapalona od razu.',
    u_keeper:'Latarnik portowy', d_keeper:'Latarnik na falochronie kieruje własną lampę na najbliższy statek.', d_keeper2:'Jego lampa sięga dalej i obraca się szybciej.', d_keeper3:'Drugi latarnik obejmuje drugi falochron.',
    u_calm:'Spokojne załogi', d_calm:'Statki w ciemności błądzą o 25% mniej.',
    u_wick:'Dobry knot', d_wick:'Mnożnik serii rośnie co 2 statki zamiast co 3.',
    u_scan:'Snop zwiadowczy', d_scan:'Drugi, niebieski snop krąży sam. Ujawnia piratów i odciąga ich od latarni.', d_scan2:'Zwiadowczy snop obraca się szybciej i jest szerszy.', d_scan3:'Drugi snop zwiadowczy, naprzeciw pierwszego.',
    u_tide:'Tablice pływów', d_tide:'Prąd znosi statki o 25% słabiej.',
    u_mirror:'Tylne lustro', d_mirror:'Słabszy snop świeci z tyłu lampy, naprzeciw głównego, z 70% zasięgu.',
    u_cranes:'Dźwigi portowe', d_cranes:'Każdy statek w porcie płaci 1 oliwę więcej.',
    u_watch:'Nocna warta', d_watch:'Piraci złapani w światło poddają się dwa razy szybciej.'
  }
};
let lang = 'en';
try {
  const saved = localStorage.getItem('lightkeeper.lang');
  if (saved === 'pl' || saved === 'en') lang = saved;
  else if ((navigator.language || '').toLowerCase().startsWith('pl')) lang = 'pl';
} catch (e) {}
const T = k => STR[lang][k] || STR.en[k] || k;
const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
function applyLang() {
  document.querySelectorAll('[data-i]').forEach(el => {
    const k = el.getAttribute('data-i');
    if (k === 'sound') el.innerHTML = AU.muted ? T('soundOff') : T('sound');
    else el.innerHTML = T(k);
  });
  document.getElementById('howText').innerHTML = isTouch ? T('howTouch') : T('how');
  langBtn.textContent = lang === 'pl' ? 'English' : 'Polski';
  if (typeof refreshResume === 'function') refreshResume();
  langBtn.setAttribute('aria-pressed', lang === 'pl' ? 'true' : 'false');
  if (G.state === 'dawn') renderCards();
  renderMeta();
}
