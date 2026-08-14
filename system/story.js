/* Odyssey chapter stories — bilingual story cards for every chapter. */
const ODYSSEY_STORY = {
  ogygia: {
    chapter: 'Chapter 01 / 첫 번째 항해',
    title: { ko: '오기기아, 떠나야 하는 섬', en: 'Ogygia: The Island He Must Leave' },
    cast: ['odysseus', 'calypso'],
    paragraphs: [
      { ko: '트로이 전쟁이 끝난 뒤에도 오디세우스의 귀향은 끝나지 않았다. 그는 아름다운 님프 칼립소의 섬에 오래 붙잡혀 있었다.', en: 'The Trojan War was over, but Odysseus was still far from home. The beautiful nymph Calypso had kept him on her island for years.' },
      { ko: '이제 신들의 바람이 바뀌었다. 집을 기억하는 사람만이 바다를 건널 수 있다.', en: 'Now the winds of the gods are changing. Only someone who remembers home can cross the sea.' }
    ]
  },
  scheria: {
    chapter: 'Chapter 02 / 두 번째 항해',
    title: { ko: '스케리아, 낯선 땅의 환대', en: 'Scheria: Welcome on a Strange Shore' },
    cast: ['odysseus', 'nausicaa', 'alcinous'],
    paragraphs: [
      { ko: '폭풍은 오디세우스를 파이아케스인의 해안으로 밀어 올렸다. 그는 이름도, 가진 것도 없이 낯선 땅에 도착했다.', en: 'A storm carried Odysseus to the shore of the Phaeacians. He arrived in a strange land with no name and no possessions.' },
      { ko: '나우시카아의 친절과 알키노오스 왕의 환대가 그에게 다시 목소리를 돌려준다. 귀향은 이야기를 들려주는 일에서 시작된다.', en: 'Nausicaa’s kindness and King Alcinous’ hospitality give him his voice again. A homecoming begins by telling the story.' }
    ]
  },
  cicones: {
    chapter: 'Chapter 03 / 세 번째 항해',
    title: { ko: '키코네스, 승리 뒤의 절제', en: 'The Cicones: Restraint After Victory' },
    cast: ['odysseus', 'ciconian'],
    paragraphs: [
      { ko: '첫 번째 상륙에서 오디세우스의 선원들은 이겼지만, 승리 뒤에 너무 오래 머물렀다. 바다는 자만심을 기다려 주지 않는다.', en: 'At the first landing, Odysseus’ crew won—but stayed too long after victory. The sea does not wait for pride to fade.' },
      { ko: '전쟁터에서 필요한 것은 힘만이 아니다. 언제 멈추고 떠날지 아는 판단도 용기다.', en: 'A battlefield needs more than strength. Knowing when to stop and leave is also courage.' }
    ]
  },
  lotus: {
    chapter: 'Chapter 04 / 네 번째 항해',
    title: { ko: '로토파고스, 잊고 싶은 낙원', en: 'The Lotus-Eaters: A Paradise of Forgetting' },
    cast: ['odysseus', 'lotus'],
    paragraphs: [
      { ko: '연꽃을 먹은 선원들은 고향과 가족을 잊고 섬에 남고 싶어 했다. 편안함은 때때로 가장 달콤한 감옥이 된다.', en: 'The sailors who tasted the lotus forgot home and family. Comfort can become the sweetest prison.' },
      { ko: '오디세우스는 동료를 배에 묶어 데려간다. 기억은 귀향을 향해 나아가는 작은 나침반이다.', en: 'Odysseus carries his companions back to the ship. Memory is a small compass pointing home.' }
    ]
  },
  cyclops: {
    chapter: 'Chapter 05 / 다섯 번째 항해',
    title: { ko: '키클롭스의 동굴, 이름과 지혜', en: 'The Cyclops’ Cave: Names and Cunning' },
    cast: ['odysseus', 'polyphemus'],
    paragraphs: [
      { ko: '외눈박이 거인 폴리페모스는 손님을 맞이하는 법을 몰랐다. 오디세우스는 힘이 아닌 계략으로 동굴을 빠져나갈 길을 찾는다.', en: 'The one-eyed giant Polyphemus knew nothing of hospitality. Odysseus must find a way out with cunning, not strength.' },
      { ko: '하지만 바다 위에서 자랑한 이름은 포세이돈의 분노를 불렀다. 지혜로운 승리에도 대가는 따른다.', en: 'But the name he boasted at sea called Poseidon’s anger. Even a clever victory can carry a cost.' }
    ]
  },
  aeaea: {
    chapter: 'Chapter 06 / 여섯 번째 항해',
    title: { ko: '아이아이에, 변신의 섬', en: 'Aeaea: The Island of Transformation' },
    cast: ['odysseus', 'circe'],
    paragraphs: [
      { ko: '마녀 키르케는 선원들을 돼지로 바꾸었지만, 오디세우스는 헤르메스의 도움으로 맞선다. 위험한 사람도 길의 안내자가 될 수 있다.', en: 'The witch Circe turned the sailors into pigs, but Odysseus faced her with Hermes’ help. A dangerous person can still become a guide.' },
      { ko: '섬에서의 쉼은 달콤하지만 귀향의 약속을 잊어서는 안 된다.', en: 'Rest on the island is sweet, but the promise of home must not be forgotten.' }
    ]
  },
  underworld: {
    chapter: 'Chapter 07 / 일곱 번째 항해',
    title: { ko: '저승, 답을 듣는 어둠', en: 'The Underworld: Answers in the Dark' },
    cast: ['odysseus', 'tiresias'],
    paragraphs: [
      { ko: '오디세우스는 예언자 테이레시아스를 만나기 위해 죽은 자들의 나라로 내려간다. 미래를 알기 위해 과거의 목소리를 들어야 한다.', en: 'Odysseus descends to the land of the dead to meet the prophet Tiresias. To learn the future, he must listen to the voices of the past.' },
      { ko: '저승의 충고는 간단하지 않다. 귀향에는 금기와 책임이 함께 따라온다.', en: 'The Underworld offers no simple advice. A homecoming carries both taboos and responsibility.' }
    ]
  },
  sirens: {
    chapter: 'Chapter 08 / 여덟 번째 항해',
    title: { ko: '세이렌의 바다, 약속의 힘', en: 'The Sirens: The Strength of a Promise' },
    cast: ['odysseus', 'siren', 'poseidon'],
    paragraphs: [
      { ko: '세이렌의 노래는 누구보다 아름답지만, 듣는 사람을 바다에 붙잡아 둔다. 오디세우스는 듣고 싶다는 마음과 살아남고 싶다는 약속을 함께 묶는다.', en: 'The Sirens sing more beautifully than anyone, but their song traps listeners at sea. Odysseus binds his desire to listen with a promise to survive.' },
      { ko: '유혹을 없애는 것이 아니라, 유혹 속에서도 지킬 규칙을 만드는 것이 지혜다.', en: 'Wisdom is not removing temptation. It is making rules you can keep while temptation is near.' }
    ]
  },
  thrinacia: {
    chapter: 'Chapter 09 / 아홉 번째 항해',
    title: { ko: '트리나키아, 굶주림과 맹세', en: 'Thrinacia: Hunger and an Oath' },
    cast: ['odysseus', 'eurylochus'],
    paragraphs: [
      { ko: '태양신의 소 떼가 섬을 돌아다닌다. 배고픔은 동료들에게 쉬운 길을 속삭이지만, 약속을 깨는 순간 귀향의 길은 다시 어두워진다.', en: 'The Sun god’s cattle roam the island. Hunger whispers an easy path to the crew, but breaking their promise darkens the road home.' },
      { ko: '공동체의 선택은 한 사람의 운명만 바꾸지 않는다. 함께 탄 배 전체가 그 결과를 짊어진다.', en: 'A community’s choice does not change one person’s fate alone. Everyone aboard the ship carries its result.' }
    ]
  },
  ithaca: {
    chapter: 'Chapter 10 / 마지막 항해',
    title: { ko: '이타카, 돌아온 사람의 시험', en: 'Ithaca: The Test of the Returned King' },
    cast: ['odysseus', 'athena', 'penelope', 'telemachus'],
    paragraphs: [
      { ko: '마침내 이타카가 보인다. 그러나 집에 도착하는 것과 집에 다시 받아들여지는 것은 다른 시험이다.', en: 'At last, Ithaca appears. But arriving home and being welcomed home are different tests.' },
      { ko: '아테나의 지혜, 텔레마코스의 용기, 페넬로페의 판단이 오디세우스의 마지막 싸움을 돕는다.', en: 'Athena’s wisdom, Telemachus’ courage, and Penelope’s judgment guide Odysseus through his final battle.' }
    ]
  }
};

/* v4 HD: 장면의 갈등과 플레이 목표를 연결하는 작전 기록 */
const ODYSSEY_BRIEFING = {
  ogygia: {
    art:'assets/story-ogygia.jpg',
    hook:'불멸의 평온을 버려야만 인간의 집으로 돌아갈 수 있다.',
    question:'영원히 안전한 섬과 늙고 죽을 수 있는 고향 가운데 무엇을 선택할 것인가?',
    mission:'칼립소와 대화해 오디세우스가 섬을 떠나지 못한 이유를 확인하고, 신들의 명령과 자신의 귀향 의지를 모아 뗏목을 출항시켜라.',
    tasks:['칼립소에게 억류와 사랑의 경계를 묻는다','뮤즈에게 지금까지의 귀향 경로를 확인한다','항해 도구를 준비하고 뗏목을 띄운다']
  },
  scheria: {
    art:'assets/story-scheria.jpg',
    hook:'모든 것을 잃은 이방인은 자신의 이름보다 먼저 믿음을 얻어야 한다.',
    question:'낯선 땅에서 도움을 청할 때 용기와 예의는 어떻게 함께 작용할까?',
    mission:'나우시카아의 신뢰를 얻고 알키노오스 왕의 환대를 받아라. 연회에서 정체를 밝힌 뒤, 트로이 이후의 항해를 증언해 귀향선을 얻어야 한다.',
    tasks:['나우시카아에게 위협 없이 도움을 청한다','파이아케스의 환대 관습을 배운다','알키노오스 앞에서 항해 이야기를 시작한다']
  },
  cicones: {
    art:'assets/story-cicones.jpg',
    hook:'승리를 거둔 순간 떠나지 못한 자만이 패배를 맞는다.',
    question:'전리품을 더 얻으려는 욕심과 안전하게 귀환할 책임 중 무엇이 우선일까?',
    mission:'이즈마로스의 약탈 뒤 철수 명령이 왜 무시되었는지 조사하라. 역습이 시작되기 전에 흩어진 선원을 모으고 피해를 줄여 출항해야 한다.',
    tasks:['선원들이 해안에 머문 이유를 듣는다','키코네스의 지원군이 오는 길을 확인한다','전리품보다 생존을 택해 철수한다']
  },
  lotus: {
    art:'assets/story-lotus.jpg',
    hook:'고통을 잊게 하는 달콤함은 귀향의 이유까지 지워 버린다.',
    question:'괴로운 기억을 잊는 것이 행복이라면, 반드시 기억해야 할 것은 무엇일까?',
    mission:'연꽃의 효과를 알아내고 기억을 잃은 동료들을 찾아라. 강제로라도 배에 데려와 고향을 기억하게 하고 섬의 유혹에서 벗어나야 한다.',
    tasks:['연꽃을 먹은 선원의 변화를 관찰한다','귀향의 기억을 되살릴 단서를 모은다','모든 동료를 배로 데려온다']
  },
  cyclops: {
    art:'assets/story-cyclops.jpg',
    hook:'괴물의 힘을 이긴 지혜도 자랑하는 순간 새로운 재앙이 된다.',
    question:'살아남기 위한 속임수는 언제 지혜이고, 승리를 뽐내는 일은 언제 오만이 될까?',
    mission:'폴리페모스의 동굴 구조와 양 떼의 움직임을 살펴 탈출책을 완성하라. ‘아무도’라는 이름과 포도주를 이용하되, 바다에서 진짜 이름을 외치고 싶은 충동을 견뎌야 한다.',
    tasks:['괴력으로 열 수 없는 동굴 입구를 조사한다','포도주와 거짓 이름으로 거인을 속인다','양의 배 아래 숨어 동료들과 탈출한다']
  },
  aeaea: {
    art:'assets/story-aeaea.jpg',
    hook:'적을 쓰러뜨리는 것보다 적과 새로운 약속을 맺는 편이 더 현명할 때가 있다.',
    question:'위험한 힘을 지닌 상대를 믿을 수 있는 안내자로 바꾸려면 무엇이 필요할까?',
    mission:'헤르메스의 몰리 약초로 키르케의 마법을 견디고, 동료들을 원래 모습으로 돌려놓을 맹세를 받아라. 섬의 안락함에 머물지 말고 다음 길을 물어야 한다.',
    tasks:['변신 마법의 원리와 약점을 확인한다','키르케에게 동료를 되돌릴 맹세를 받는다','저승으로 가야 한다는 예언을 듣는다']
  },
  underworld: {
    art:'assets/story-underworld.jpg',
    hook:'앞으로 나아갈 길은 살아 있는 자가 외면해 온 과거의 목소리 속에 있다.',
    question:'미래를 알고 싶다면 왜 먼저 죽은 자들과 자신의 상실을 마주해야 할까?',
    mission:'저승의 의식을 올바르게 치르고 테이레시아스의 혼을 찾아라. 태양신의 소와 포세이돈의 분노에 관한 경고를 기록하고, 다른 망자들의 목소리도 존중해야 한다.',
    tasks:['저승의 문을 여는 의식을 완성한다','테이레시아스의 귀향 예언을 기록한다','금기와 책임을 항해 일지에 남긴다']
  },
  sirens: {
    art:'assets/story-sirens.jpg',
    hook:'유혹을 피할 수 없다면, 흔들릴 때의 자신을 미리 묶어 두어야 한다.',
    question:'알고 싶은 욕망을 포기하지 않으면서도 모두의 안전을 지킬 방법은 무엇일까?',
    mission:'선원들과 사전에 규칙을 정하고 세이렌의 바다를 통과하라. 밀랍으로 귀를 막고 오디세우스를 돛대에 묶은 뒤, 어떤 명령이 내려져도 약속을 지켜야 한다.',
    tasks:['세이렌 노래의 위험을 확인한다','선원들의 귀와 돛대의 밧줄을 준비한다','유혹 중에도 사전 약속을 끝까지 지킨다']
  },
  thrinacia: {
    art:'assets/story-thrinacia.jpg',
    hook:'굶주린 공동체에서 한 사람의 옳은 명령만으로는 약속을 지킬 수 없다.',
    question:'생존이 위태로울 때 금기를 지키게 만드는 지도자의 책임은 어디까지일까?',
    mission:'태양신의 소를 해치지 말라는 예언을 모두에게 상기시키고 식량을 관리하라. 폭풍이 길어질수록 커지는 불만을 다루며 공동의 맹세가 무너지지 않게 해야 한다.',
    tasks:['태양신의 금기와 결과를 선원에게 알린다','남은 식량을 공정하게 배분한다','에우리로코스의 반론에 책임 있게 대응한다']
  },
  ithaca: {
    art:'assets/story-ithaca.jpg',
    hook:'고향에 닿았다는 사실만으로 왕과 남편과 아버지의 자리를 되찾을 수는 없다.',
    question:'복수, 정의, 가족의 재회 가운데 돌아온 왕이 가장 먼저 증명해야 할 것은 무엇일까?',
    mission:'아테나의 변장을 유지하며 이타카의 상황을 확인하라. 텔레마코스와 협력하고 페넬로페의 시험을 통과한 뒤, 구혼자들을 상대하되 귀향이 또 다른 전쟁으로 끝나지 않게 해야 한다.',
    tasks:['정체를 숨긴 채 충성스러운 사람을 구별한다','텔레마코스와 궁전 탈환 계획을 세운다','활의 시험과 부부의 비밀로 정체를 증명한다']
  }
};
