import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😀',
    emojis: [
      { char: '😀', name: 'rosto sorridente grinning face feliz alegre sorrindo', tags: ['smile', 'happy', 'joy', 'grin', 'sorriso', 'feliz', 'alegre'] },
      { char: '😃', name: 'rosto sorridente olhos arregalados big eyes feliz', tags: ['smile', 'happy', 'joy', 'grin', 'sorriso', 'feliz'] },
      { char: '😄', name: 'rosto sorridente olhos fechados smiling eyes feliz rindo', tags: ['smile', 'happy', 'joy', 'laugh', 'giggle', 'feliz', 'rindo'] },
      { char: '😁', name: 'rosto sorridente dentes grinning teeth feliz riso', tags: ['smile', 'happy', 'grin', 'teeth', 'feliz', 'dentes'] },
      { char: '😆', name: 'rosto rindo muito squinting face gargalhada risada', tags: ['smile', 'happy', 'laugh', 'giggle', 'risada', 'gargalhada'] },
      { char: '😅', name: 'rosto rindo suor frio sweat nervous suor nervoso', tags: ['smile', 'happy', 'nervous', 'sweat', 'suor', 'nervoso'] },
      { char: '😂', name: 'chorar de rir tears of joy chorando gargalhada risada', tags: ['laugh', 'cry', 'tears', 'joy', 'rindo', 'chorando'] },
      { char: '🤣', name: 'rolar de rir rofl chao gargalhada risada', tags: ['laugh', 'rofl', 'rolling', 'rindo', 'chao'] },
      { char: '😊', name: 'sorrindo envergonhado blush smiling sorrindo bochecha', tags: ['smile', 'happy', 'blush', 'warm', 'sorriso', 'timido'] },
      { char: '😇', name: 'sorrindo anjo inocente halo angel', tags: ['angel', 'innocent', 'halo', 'anjo', 'santo'] },
      { char: '🙂', name: 'sorriso leve slight smile sorrindo', tags: ['smile', 'slight', 'sorriso'] },
      { char: '🙃', name: 'cabeca para baixo upside down sarcasmo brincadeira', tags: ['upside', 'down', 'sarcasm', 'silly', 'invertido', 'brincadeira'] },
      { char: '😉', name: 'piscando olho wink piscadela', tags: ['wink', 'flirt', 'playful', 'piscando', 'olho'] },
      { char: '😌', name: 'aliviado relieved calmo paz tranquilo', tags: ['relieved', 'calm', 'peace', 'alivio', 'calmo'] },
      { char: '😍', name: 'olhos coracao heart eyes amor apaixonado amar', tags: ['love', 'heart', 'adore', 'crush', 'amor', 'apaixonado'] },
      { char: '🥰', name: 'apaixonado coracoes hearts love amor carinho', tags: ['love', 'heart', 'affection', 'warm', 'amor', 'coracoes'] },
      { char: '😘', name: 'mandando beijo kiss blowing amor carinho', tags: ['kiss', 'love', 'heart', 'affection', 'beijo', 'amor'] },
      { char: '😋', name: 'provando comida deliciosa yummy delicious delicia lingua', tags: ['yummy', 'food', 'delicious', 'delicia', 'comida', 'lingua'] },
      { char: '😛', name: 'mostrando lingua tongue careta brincadeira', tags: ['tongue', 'silly', 'lingua', 'careta'] },
      { char: '😜', name: 'piscando com lingua winking tongue careta', tags: ['tongue', 'wink', 'silly', 'piscando', 'careta'] },
      { char: '🤪', name: 'rosto maluco crazy face bobo careta doido', tags: ['crazy', 'goofy', 'silly', 'maluco', 'bobo'] },
      { char: '🤨', name: 'sobrancelha levantada eyebrow duvida desconfiado', tags: ['doubt', 'suspicious', 'sobrancelha', 'duvida'] },
      { char: '🧐', name: 'monoculo monocle intelectual detetive examinando', tags: ['monocle', 'smart', 'investigate', 'monoculo', 'intelectual'] },
      { char: '🤓', name: 'nerd nerd face oculos inteligente', tags: ['nerd', 'geek', 'glasses', 'oculos', 'inteligente'] },
      { char: '😎', name: 'oculos escuros cool sunglasses legal estiloso', tags: ['cool', 'sunglasses', 'legal', 'estilo'] },
      { char: '🤩', name: 'olhos estrela star struck empolgado impressionado', tags: ['star', 'excited', 'empolgado', 'estrela'] },
      { char: '🥳', name: 'festa party comemoracao aniversario confete', tags: ['party', 'celebrate', 'horn', 'festa', 'comemorar'] },
      { char: '😏', name: 'sorriso sarcastico smirk deboche ironia', tags: ['smirk', 'sarcasm', 'irony', 'deboche', 'sarcastico'] },
      { char: '😒', name: 'descontente unamused chateado tedio desinteressado', tags: ['unamused', 'bored', 'annoyed', 'tedio', 'chateado'] },
      { char: '😞', name: 'decepcionado disappointed triste chateado arrependido', tags: ['sad', 'disappointed', 'triste', 'decepcionado'] },
      { char: '😔', name: 'pensativo pensive triste cabisbaixo', tags: ['sad', 'pensive', 'triste', 'pensativo'] },
      { char: '😟', name: 'preocupado worried tenso ansioso', tags: ['worried', 'nervous', 'preocupado', 'tenso'] },
      { char: '😕', name: 'confuso confused em duvida indeciso', tags: ['confused', 'puzzled', 'confuso', 'duvida'] },
      { char: '🙁', name: 'levemente triste frown chateado', tags: ['sad', 'frown', 'triste'] },
      { char: '😣', name: 'perseverando suffering sofrendo tenso', tags: ['struggle', 'sad', 'tenso', 'sofrimento'] },
      { char: '😖', name: 'confuso chateado confounded agoniado', tags: ['sad', 'confounded', 'chateado', 'ruim'] },
      { char: '😫', name: 'cansado tired exausto cansaco desespero', tags: ['tired', 'exhausted', 'cansado', 'exausto'] },
      { char: '😩', name: 'exausto weary cansado chateado desesperado', tags: ['tired', 'weary', 'exausto', 'cansado'] },
      { char: '🥺', name: 'por favor pleading puppy face implorando fofo', tags: ['pleading', 'puppy', 'cute', 'por favor', 'fofo'] },
      { char: '😢', name: 'triste choro chorando lagrima crying tear', tags: ['sad', 'cry', 'tear', 'triste', 'choro', 'lagrima'] },
      { char: '😭', name: 'chorando muito loud crying pranto choro lagrimas', tags: ['sad', 'cry', 'sob', 'choro', 'chorando'] },
      { char: '😤', name: 'bravo irritado fumando triumph raiva', tags: ['angry', 'triumph', 'rage', 'bravo', 'irritado'] },
      { char: '😠', name: 'irritado angry bravo chateado emburrado', tags: ['angry', 'mad', 'bravo', 'irritado', 'raiva'] },
      { char: '😡', name: 'muito bravo pouting com raiva vermelho furioso', tags: ['angry', 'mad', 'rage', 'bravo', 'raiva', 'furioso'] },
      { char: '🤬', name: 'xingando swearing palavrao xingamento raiva', tags: ['angry', 'swear', 'rage', 'palavrao', 'xingando'] },
      { char: '🤯', name: 'cabeca explodindo mind blown explodiu choque impressionado', tags: ['mind', 'blown', 'shock', 'explodiu', 'choque'] },
      { char: '😳', name: 'vergonha flushed corado assustado surpreso', tags: ['flushed', 'blush', 'shock', 'vergonha', 'corado'] },
      { char: '🥵', name: 'calor quente hot suando calor sufocante', tags: ['hot', 'sweat', 'heat', 'quente', 'calor'] },
      { char: '🥶', name: 'frio gelado cold congelando azul', tags: ['cold', 'freeze', 'ice', 'frio', 'gelado'] },
      { char: '😱', name: 'gritando medo screaming fear assustado panico horror', tags: ['fear', 'scream', 'shock', 'medo', 'assustado'] },
      { char: '😨', name: 'assustado fearful medo surpreso tenso', tags: ['fear', 'scared', 'medo', 'assustado'] },
      { char: '😰', name: 'preocupado suor frio anxious sweat ansiedade tenso', tags: ['fear', 'sweat', 'anxious', 'preocupado', 'tenso'] },
      { char: '😥', name: 'aliviado mas triste sad but relieved suor chateado', tags: ['sad', 'sweat', 'relieved', 'alivio', 'triste'] },
      { char: '😓', name: 'suor testa deprimido downcast sweat chateado', tags: ['sad', 'sweat', 'stressed', 'cansado', 'chateado'] },
      { char: '🤔', name: 'pensando thinking duvida refletindo pensativo', tags: ['thinking', 'ponder', 'pensar', 'duvida'] },
      { char: '🤭', name: 'mao na boca hand over mouth risinho segredo risada', tags: ['gasp', 'giggle', 'secret', 'risinho', 'segredo'] },
      { char: '🤫', name: 'silencio shushing quieto calado segredo', tags: ['quiet', 'silence', 'shush', 'silencio', 'quieto'] },
      { char: '🤥', name: 'mentiroso lying face nariz mentira pinocquio', tags: ['lie', 'pinocchio', 'mentira', 'mentiroso'] },
      { char: '😶', name: 'sem boca speechless calado mudo', tags: ['silent', 'speechless', 'mudo', 'calado'] },
      { char: '😐', name: 'neutro neutral serio sem expressao tanto faz', tags: ['neutral', 'indifferent', 'serio', 'tanto faz'] },
      { char: '😑', name: 'sem expressao expressionless cansado tedio serio', tags: ['indifferent', 'bored', 'serio', 'tedio'] },
      { char: '😬', name: 'careta grimace tenso vergonha dentes', tags: ['grimace', 'tense', 'careta', 'tenso'] },
      { char: '🙄', name: 'olhos rolando rolling eyes desdem ironia chateado', tags: ['bored', 'annoyed', 'roll', 'tedio', 'desdem'] },
      { char: '😴', name: 'dormindo sleeping sono zzz roncando', tags: ['sleep', 'zzz', 'dream', 'sono', 'dormindo'] },
      { char: '🤤', name: 'babando drooling desejo com fome delicioso', tags: ['drool', 'desire', 'yummy', 'babando', 'desejo'] },
      { char: '😪', name: 'com sono sleepy cansado sono resfriado', tags: ['sleep', 'tired', 'sono', 'cansado'] },
      { char: '😵', name: 'tonto dizzy confuso atordoado estrela', tags: ['dizzy', 'shock', 'tonto', 'atordoado'] },
      { char: '🤐', name: 'boca fechada zipper boca calada segredo', tags: ['silence', 'secret', 'zipper', 'calado', 'segredo'] },
      { char: '🥴', name: 'tonto embriagado woozy bebado ressacado', tags: ['drunk', 'woozy', 'bebado', 'tonto'] },
      { char: '🤢', name: 'enjoado nauseated nojo verde mal', tags: ['sick', 'gross', 'nausea', 'enjoo', 'nojo'] },
      { char: '🤮', name: 'vomitando vomiting vomito nojo doente', tags: ['sick', 'vomit', 'gross', 'vomito', 'doente'] },
      { char: '🤧', name: 'espirrando sneezing espirro resfriado gripe alergia', tags: ['sick', 'sneeze', 'cold', 'gripe', 'espirro'] },
      { char: '😷', name: 'mascara medica medical mask cirurgica doente hospital', tags: ['sick', 'mask', 'doctor', 'mascara', 'doente'] },
      { char: '🤒', name: 'termometro thermometer febre doente doenca', tags: ['sick', 'fever', 'febre', 'doente'] },
      { char: '🤕', name: 'machucado cabeça enfaixada bandage ferido hospital', tags: ['sick', 'hurt', 'injury', 'machucado', 'ferido'] },
      { char: '😈', name: 'diabinho sorrindo devil horns malvado travesso', tags: ['devil', 'horns', 'evil', 'diabo', 'malvado'] },
      { char: '👿', name: 'diabinho bravo angry devil malvado raiva', tags: ['devil', 'evil', 'angry', 'diabo', 'bravo'] },
      { char: '💩', name: 'coco poop coco sorridente bosta', tags: ['poop', 'poo', 'shit', 'coco', 'bosta'] },
      { char: '👻', name: 'fantasma ghost assombrado assustador halloween', tags: ['ghost', 'spooky', 'halloween', 'fantasma', 'assustador'] },
      { char: '💀', name: 'caveira skull morte esqueleto perigo', tags: ['skull', 'death', 'skeleton', 'caveira', 'morte'] },
      { char: '👽', name: 'alien alienigena E.T. extraterrestre espaco', tags: ['alien', 'space', 'ufo', 'alienigena', 'espaco'] },
      { char: '👾', name: 'monstro pixel alien space invader jogo game', tags: ['game', 'retro', 'pixel', 'jogo', 'monstro'] },
      { char: '🤖', name: 'robo robot tecnologia maquina inteligência artificial', tags: ['robot', 'bot', 'machine', 'robo', 'tecnologia'] },
      { char: '🎃', name: 'abobora jack-o-lantern halloween abobora iluminada', tags: ['pumpkin', 'halloween', 'abobora'] },
      { char: '❤️', name: 'coracao vermelho red heart amor paixao amar', tags: ['love', 'heart', 'romance', 'amor', 'coracao'] },
      { char: '🔥', name: 'fogo fire chama quente fogoso sucesso', tags: ['fire', 'hot', 'lit', 'fogo', 'chama'] },
      { char: '✨', name: 'brilhos sparkles estrelas magico brilhar', tags: ['sparkles', 'magic', 'clean', 'brilho', 'magia'] },
    ]
  },
  {
    id: 'people',
    name: 'People & Body',
    icon: '👋',
    emojis: [
      { char: '👋', name: 'tchau acenando waving hand ola adeus aceno', tags: ['wave', 'hello', 'bye', 'tchau', 'ola', 'aceno'] },
      { char: '✋', name: 'mao aberta raised hand pare stop cinco', tags: ['stop', 'hand', 'pare', 'mao'] },
      { char: '👌', name: 'ok okay legal perfeito tudo certo', tags: ['ok', 'okay', 'perfect', 'perfeito'] },
      { char: '✌️', name: 'paz e amor victory hand vitoria dois', tags: ['peace', 'victory', 'two', 'paz', 'vitoria'] },
      { char: '🤙', name: 'me liga call me hang loose tranquilo de boa', tags: ['call', 'phone', 'surf', 'me liga', 'tranquilo'] },
      { char: '👈', name: 'apontando esquerda point left indicador', tags: ['point', 'left', 'esquerda', 'apontar'] },
      { char: '👉', name: 'apontando direita point right indicador', tags: ['point', 'right', 'direita', 'apontar'] },
      { char: '👆', name: 'apontando cima point up indicador para cima', tags: ['point', 'up', 'cima', 'apontar'] },
      { char: '👇', name: 'apontando baixo point down indicador para baixo', tags: ['point', 'down', 'baixo', 'apontar'] },
      { char: '👍', name: 'positivo curtir thumbs up gostei bom aprovar', tags: ['thumbs', 'up', 'like', 'yes', 'gostei', 'positivo'] },
      { char: '👎', name: 'negativo thumbs down nao gostei desaprovar ruim', tags: ['thumbs', 'down', 'dislike', 'no', 'ruim', 'negativo'] },
      { char: '👊', name: 'soco punho cerrado oncoming fist pancada', tags: ['fist', 'punch', 'soco', 'punho'] },
      { char: '👏', name: 'palmas aplauso clapping hands parabens', tags: ['clap', 'applause', 'bravo', 'palmas', 'aplauso'] },
      { char: '🙌', name: 'maos para cima celebrating hands comemoracao gloria', tags: ['celebrate', 'hands', 'gloria', 'comemorar'] },
      { char: '🙏', name: 'por favor obrigado praying hands rezando gratidao prece', tags: ['pray', 'please', 'thanks', 'reza', 'gratidao'] },
      { char: '💪', name: 'biceps forte flexed biceps forca academia musculacao', tags: ['strong', 'biceps', 'muscle', 'forca', 'forte'] },
      { char: '🧠', name: 'cerebro brain mente inteligencia pensamento', tags: ['brain', 'mind', 'smart', 'cerebro', 'inteligente'] },
      { char: '👀', name: 'olhos eyes observando vigiando olhando de olho', tags: ['eyes', 'look', 'watch', 'olhos', 'olhando'] },
      { char: '🗣️', name: 'silhueta falando speaking head voz conversar', tags: ['speak', 'talk', 'voice', 'falar', 'voz'] },
      { char: '👤', name: 'silhueta busto bust in silhouette perfil usuario', tags: ['user', 'profile', 'silhouette', 'perfil', 'usuario'] },
      { char: '🧑', name: 'pessoa person humano alguem', tags: ['person', 'human', 'pessoa', 'gente'] },
      { char: '👨', name: 'homem man adulto masculino', tags: ['man', 'male', 'homem'] },
      { char: '👩', name: 'mulher woman adulta feminina', tags: ['woman', 'female', 'mulher'] },
      { char: '👶', name: 'bebe baby recem nascido criancinha', tags: ['baby', 'infant', 'bebe', 'nenem'] },
      { char: '👵', name: 'idosa velha old woman vovo avo feminina', tags: ['old', 'woman', 'grandma', 'avo', 'velha'] },
      { char: '👴', name: 'idoso velho old man vovo avo masculino', tags: ['old', 'man', 'grandpa', 'avo', 'velho'] },
    ]
  },
  {
    id: 'nature',
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      { char: '🐶', name: 'cachorro cao dog face pet animal de estimacao', tags: ['dog', 'puppy', 'pet', 'animal', 'cachorro', 'cao'] },
      { char: '🐱', name: 'gato cat face felino pet animal', tags: ['cat', 'kitty', 'pet', 'animal', 'gato'] },
      { char: '🐭', name: 'rato mouse face roedor animal', tags: ['mouse', 'animal', 'rato'] },
      { char: '🐹', name: 'hamster hamster face roedor pet', tags: ['hamster', 'pet', 'animal'] },
      { char: '🐰', name: 'coelho rabbit face pascoa roedor', tags: ['rabbit', 'bunny', 'pascoa', 'coelho'] },
      { char: '🦊', name: 'raposa fox face esperto animal', tags: ['fox', 'animal', 'raposa'] },
      { char: '🐻', name: 'urso bear face urso panda animal', tags: ['bear', 'animal', 'urso'] },
      { char: '🐼', name: 'panda panda face urso panda animal', tags: ['panda', 'animal'] },
      { char: '🐨', name: 'coala koala animal', tags: ['koala', 'animal', 'coala'] },
      { char: '🐯', name: 'tigre tiger face felino listras animal', tags: ['tiger', 'animal', 'tigre'] },
      { char: '🦁', name: 'leao lion face rei da selva animal', tags: ['lion', 'animal', 'leao'] },
      { char: '🐮', name: 'vaca cow face boi leite animal', tags: ['cow', 'animal', 'vaca'] },
      { char: '🐷', name: 'porco pig face porquinho leitão animal', tags: ['pig', 'animal', 'porco'] },
      { char: '🐸', name: 'sapo frog face anfibio verde animal', tags: ['frog', 'animal', 'sapo'] },
      { char: '🐵', name: 'macaco monkey face primata animal', tags: ['monkey', 'animal', 'macaco'] },
      { char: '🐔', name: 'galinha chicken ave animal fazenda', tags: ['chicken', 'hen', 'fazenda', 'galinha'] },
      { char: '🐧', name: 'pinguim penguin ave gelo animal', tags: ['penguin', 'animal', 'pinguim'] },
      { char: '🐦', name: 'passaro bird ave voar animal', tags: ['bird', 'animal', 'passaro'] },
      { char: '🐤', name: 'pintinho baby chick pintainho amarelo ave', tags: ['chick', 'baby', 'ave', 'pintinho'] },
      { char: '🐺', name: 'lobo wolf face alcateia animal', tags: ['wolf', 'animal', 'lobo'] },
      { char: '🐝', name: 'abelha honeybee mel inseto animal', tags: ['bee', 'honey', 'inseto', 'abelha'] },
      { char: '🦋', name: 'borboleta butterfly asas inseto', tags: ['butterfly', 'insect', 'borboleta', 'inseto'] },
      { char: '🕷️', name: 'aranha spider aracnideo teia veneno', tags: ['spider', 'bug', 'aranha', 'aracnideo'] },
      { char: '🐬', name: 'golfinho dolphin mar oceano agua animal', tags: ['dolphin', 'sea', 'ocean', 'golfinho', 'mar'] },
      { char: '🐳', name: 'baleia whale mar oceano animal gigante', tags: ['whale', 'sea', 'ocean', 'baleia', 'mar'] },
      { char: '🦈', name: 'tubarao shark predador mar oceano animal', tags: ['shark', 'sea', 'ocean', 'tubarao', 'mar'] },
      { char: '🌲', name: 'pinheiro evergreen tree arvore floresta madeira', tags: ['tree', 'forest', 'wood', 'arvore', 'pinheiro'] },
      { char: '🌳', name: 'arvore deciduous tree natureza folhas verde', tags: ['tree', 'nature', 'arvore', 'natureza'] },
      { char: '🍁', name: 'folha de bordo maple leaf outono canada folha', tags: ['maple', 'autumn', 'canada', 'outono', 'folha'] },
      { char: '🌹', name: 'rosa rose flor vermelha amor romance', tags: ['rose', 'flower', 'love', 'rosa', 'flor'] },
      { char: '🌸', name: 'flor de cerejeira cherry blossom primavera rosa', tags: ['flower', 'cherry', 'spring', 'flor', 'primavera'] },
      { char: '🌻', name: 'girassol sunflower flor amarela sol', tags: ['flower', 'sun', 'girassol', 'flor'] },
      { char: '🌞', name: 'sol com rosto sun with face quente dia calor', tags: ['sun', 'day', 'warm', 'sol', 'dia'] },
      { char: '🌙', name: 'lua crescente crescent moon noite luar dormir', tags: ['moon', 'night', 'sleep', 'lua', 'noite'] },
      { char: '⭐', name: 'estrela star amarela brilho brilhar', tags: ['star', 'yellow', 'estrela'] },
      { char: '⚡', name: 'raio high voltage eletricidade tempestade energia', tags: ['thunder', 'lightning', 'power', 'raio', 'energia'] },
      { char: '🌈', name: 'arco-iris rainbow colorido chuva sol orgulho', tags: ['rainbow', 'color', 'pride', 'arco-iris'] },
      { char: '❄️', name: 'floco de neve snowflake frio gelo inverno', tags: ['snow', 'cold', 'winter', 'frio', 'neve'] },
      { char: '🌧️', name: 'chuva rain storm tempestade clima agua', tags: ['rain', 'weather', 'chuva', 'tempo'] },
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍏',
    emojis: [
      { char: '🍎', name: 'maca vermelha red apple fruta saudavel', tags: ['apple', 'fruit', 'maca', 'fruta'] },
      { char: '🍌', name: 'banana fruta amarela potassio', tags: ['banana', 'fruit', 'banana', 'fruta'] },
      { char: '🍉', name: 'melancia watermelon fruta grande agua calor', tags: ['watermelon', 'fruit', 'melancia', 'fruta'] },
      { char: '🍇', name: 'uva grapes fruta vinho cacho', tags: ['grapes', 'fruit', 'uva', 'fruta'] },
      { char: '🍓', name: 'morango strawberry fruta vermelha doce sobremesa', tags: ['strawberry', 'fruit', 'morango', 'fruta'] },
      { char: '🍒', name: 'cereja cherries fruta vermelha doce cerejas', tags: ['cherries', 'fruit', 'cereja', 'fruta'] },
      { char: '🥑', name: 'abacate avocado verde salada saudavel', tags: ['avocado', 'food', 'abacate'] },
      { char: '🥔', name: 'batata potato legume pure fritas', tags: ['potato', 'food', 'batata'] },
      { char: '🥕', name: 'cenoura carrot vegetal legume coelho', tags: ['carrot', 'food', 'cenoura', 'legume'] },
      { char: '🌽', name: 'milho ear of corn espiga pipoca alimento', tags: ['corn', 'food', 'milho', 'pipoca'] },
      { char: '🍞', name: 'pao bread padaria torrada cafe da manha', tags: ['bread', 'bakery', 'pao', 'padaria'] },
      { char: '🧀', name: 'queijo cheese queijinho mouse amarelo', tags: ['cheese', 'dairy', 'queijo'] },
      { char: '🍗', name: 'coxa de frango poultry leg assado carne comida', tags: ['chicken', 'meat', 'frango', 'coxa', 'carne'] },
      { char: '🍔', name: 'hamburguer hamburger fast food lanche carne queijo', tags: ['burger', 'meat', 'fastfood', 'hamburguer', 'lanche'] },
      { char: '🍟', name: 'batata frita french fries fast food lanche salgado', tags: ['fries', 'fastfood', 'batata', 'frita'] },
      { char: '🍕', name: 'pizza fatia queijo pepperoni fast food lanche', tags: ['pizza', 'cheese', 'fastfood', 'pizza', 'lanche'] },
      { char: '🌭', name: 'cachorro quente hot dog fast food lanche salsicha', tags: ['hotdog', 'fastfood', 'cachorro quente'] },
      { char: '🍳', name: 'ovo fritar cooking fry pan ovo frito cafe da manha', tags: ['egg', 'cooking', 'pan', 'ovo', 'frito'] },
      { char: '🍜', name: 'miojo ramen noodles sopa caldo comida oriental', tags: ['noodles', 'soup', 'ramen', 'miojo', 'sopa'] },
      { char: '🍣', name: 'sushi peixe arroz comida japonesa oriental', tags: ['sushi', 'fish', 'japanese', 'sushi', 'comida'] },
      { char: '🍩', name: 'rosquinha donut doce sobremesa padaria', tags: ['donut', 'sweet', 'rosquinha', 'doce'] },
      { char: '🍪', name: 'cookie biscoito chocolate doce sobremesa bolacha', tags: ['cookie', 'sweet', 'biscoito', 'bolacha', 'doce'] },
      { char: '🎂', name: 'bolo de aniversario birthday cake festa velas doce', tags: ['cake', 'birthday', 'party', 'bolo', 'aniversario'] },
      { char: '🍫', name: 'chocolate barra doce cacau sobremesa', tags: ['chocolate', 'sweet', 'chocolate', 'doce'] },
      { char: '🍬', name: 'bala candy doce guloseima embrulho', tags: ['candy', 'sweet', 'bala', 'doce'] },
      { char: '☕', name: 'cafe xicara quente hot coffee cha cafeina', tags: ['coffee', 'cup', 'tea', 'cafe', 'cha'] },
      { char: '🍵', name: 'cha verde teacup sem asa oriental infusao', tags: ['tea', 'matcha', 'cha'] },
      { char: '🍺', name: 'cerveja beer chopp gelada copo bar pub', tags: ['beer', 'alcohol', 'bar', 'cerveja', 'chopp'] },
      { char: '🍻', name: 'brinde cervejas clinking mugs brinde comemoracao bar', tags: ['beer', 'cheers', 'party', 'cerveja', 'brinde'] },
      { char: '🥂', name: 'brinde taças clinking glasses champagne brinde festa', tags: ['champagne', 'cheers', 'party', 'champanhe', 'brinde'] },
      { char: '🍷', name: 'vinho wine glass taça uva bebida alcoolica', tags: ['wine', 'alcohol', 'vinho', 'taça'] },
    ]
  },
  {
    id: 'activities',
    name: 'Activities',
    icon: '⚽',
    emojis: [
      { char: '⚽', name: 'bola de futebol soccer ball esporte partida jogo', tags: ['soccer', 'ball', 'esporte', 'futebol', 'jogo'] },
      { char: '🏀', name: 'bola de basquete basketball esporte cesta jogo', tags: ['basketball', 'esporte', 'basquete', 'jogo'] },
      { char: '🏈', name: 'futebol americano football esporte bola oval', tags: ['football', 'esporte', 'futebol americano'] },
      { char: '⚾', name: 'beisebol baseball esporte taco bola', tags: ['baseball', 'esporte', 'beisebol'] },
      { char: '🎾', name: 'tenis tennis ball esporte raquete jogo', tags: ['tennis', 'esporte', 'tenis', 'jogo'] },
      { char: '🏐', name: 'volei volleyball esporte quadra rede', tags: ['volleyball', 'esporte', 'volei'] },
      { char: '🎱', name: 'sinuca 8 ball bilhar jogo bola preta', tags: ['pool', 'billiards', 'sinuca', 'jogo'] },
      { char: '🎮', name: 'video game controle console joystick jogo playstation', tags: ['game', 'play', 'console', 'videogame', 'controle', 'jogo'] },
      { char: '🎯', name: 'alvo bullseye dardo precisao jogo pontaria', tags: ['target', 'game', 'dart', 'alvo', 'jogo'] },
      { char: '🏆', name: 'trofeu trophy campeao vitoria premio ouro em primeiro', tags: ['trophy', 'win', 'gold', 'trofeu', 'vitoria', 'campeao'] },
      { char: '🥇', name: 'medalha de ouro first place medal primeiro lugar', tags: ['gold', 'medal', 'first', 'ouro', 'medalha'] },
      { char: '🥈', name: 'medalha de prata second place medal segundo lugar', tags: ['silver', 'medal', 'second', 'prata', 'medalha'] },
      { char: '🥉', name: 'medalha de bronze third place medal terceiro lugar', tags: ['bronze', 'medal', 'third', 'bronze', 'medalha'] },
      { char: '🎨', name: 'paleta de cores artist palette pintura arte tinta pincel', tags: ['art', 'paint', 'artist', 'pintura', 'arte', 'tinta'] },
      { char: '🎤', name: 'microfone microphone cantor musica cantar karaoke', tags: ['sing', 'music', 'mic', 'cantar', 'musica', 'microfone'] },
      { char: '🎧', name: 'fone de ouvido headphone musica som audio escutar', tags: ['music', 'audio', 'sound', 'musica', 'fone', 'ouvido'] },
      { char: '🎸', name: 'guitarra guitar violão musica instrumento cordas rock', tags: ['guitar', 'music', 'rock', 'guitarra', 'violao', 'musica'] },
      { char: '🎹', name: 'teclado piano musical keyboard musica instrumento teclado', tags: ['piano', 'music', 'instrument', 'piano', 'musica'] },
      { char: '🎬', name: 'claquete clapper board cinema filme gravar hollywood', tags: ['movie', 'film', 'cinema', 'filme', 'gravacao'] },
      { char: '🎲', name: 'dado game die cassino sorte jogo tabuleiro', tags: ['game', 'dice', 'luck', 'dado', 'jogo'] },
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      { char: '🚗', name: 'carro vermelho red car automovel veiculo transito', tags: ['car', 'drive', 'travel', 'carro', 'veiculo'] },
      { char: '🚕', name: 'taxi taxi amarelo carro passageiro veiculo', tags: ['taxi', 'car', 'travel', 'taxi', 'carro'] },
      { char: '🚌', name: 'onibus bus coletivo veiculo viagem transporte', tags: ['bus', 'travel', 'onibus', 'transporte'] },
      { char: '🚓', name: 'policia police car viatura sirene autoridade', tags: ['police', 'car', 'cop', 'policia', 'viatura'] },
      { char: '🚒', name: 'bombeiros fire engine caminhao sirene socorro', tags: ['fire', 'engine', 'truck', 'bombeiro', 'caminhao'] },
      { char: '🏍️', name: 'moto motorcycle motociclista veiculo duas rodas', tags: ['motorcycle', 'bike', 'ride', 'moto', 'veiculo'] },
      { char: '🚲', name: 'bicicleta bicycle ciclista pedal esporte', tags: ['bike', 'bicycle', 'pedal', 'bicicleta', 'esporte'] },
      { char: '✈️', name: 'aviao airplane voo aeroporto viagem turismo', tags: ['plane', 'flight', 'travel', 'aviao', 'viagem'] },
      { char: '🚀', name: 'foguete rocket espaco nasa decolar decolagem', tags: ['rocket', 'space', 'launch', 'foguete', 'espaco'] },
      { char: '⛵', name: 'veleiro sailboat barco mar agua vento velejar', tags: ['boat', 'sea', 'sail', 'barco', 'veleiro', 'mar'] },
      { char: '🛳️', name: 'cruzeiro passenger ship navio mar oceano viagem', tags: ['ship', 'cruise', 'travel', 'navio', 'cruzeiro', 'mar'] },
      { char: '🚨', name: 'giroflex police light sirene emergencia perigo alarme', tags: ['siren', 'police', 'alarm', 'sirene', 'alarme', 'perigo'] },
      { char: '🗺️', name: 'mapa do mundo world map geografia turismo viagem', tags: ['map', 'travel', 'world', 'mapa', 'viagem'] },
      { char: '🧭', name: 'bussola compass direcao norte direcao orientacao', tags: ['compass', 'direction', 'bussola', 'direcao'] },
      { char: '🌋', name: 'vulcao volcano lava erupcao montanha quente', tags: ['volcano', 'nature', 'lava', 'vulcao'] },
      { char: '🏕️', name: 'acampamento camping barraca floresta ferias barraca', tags: ['camping', 'tent', 'acampamento', 'barraca'] },
      { char: '🏠', name: 'casa house lar moradia teto construcao', tags: ['house', 'home', 'casa', 'lar'] },
      { char: '🏢', name: 'predio office building escritório trabalho empresa', tags: ['building', 'office', 'work', 'predio', 'escritorio'] },
      { char: '🏥', name: 'hospital hospital medico saude doente ambulancia', tags: ['hospital', 'medical', 'doctor', 'hospital', 'saude'] },
      { char: '🏫', name: 'escola school estudante aula professor colegial', tags: ['school', 'education', 'escola', 'estudar'] },
      { char: '🏰', name: 'castelo castle rei rainha medieval contos', tags: ['castle', 'medieval', 'castelo'] },
      { char: '🗽', name: 'estatua da liberdade statue of liberty nova york eua', tags: ['statue', 'liberty', 'ny', 'eua', 'liberdade'] },
      { char: '🌃', name: 'noite estrelada night with stars cidade ceu escuro', tags: ['night', 'stars', 'city', 'noite', 'cidade'] },
    ]
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: '💡',
    emojis: [
      { char: '💡', name: 'lampada light bulb ideia luz eureka energia', tags: ['light', 'bulb', 'idea', 'lampada', 'ideia', 'luz'] },
      { char: '💻', name: 'laptop computador notebook pc programar desenvolvedor', tags: ['computer', 'laptop', 'tech', 'computador', 'notebook', 'pc'] },
      { char: '🖥️', name: 'monitor desktop pc tela computador', tags: ['computer', 'screen', 'monitor', 'tela'] },
      { char: '📱', name: 'celular mobile phone smartphone telefone iphone android', tags: ['phone', 'mobile', 'smartphone', 'celular', 'telefone'] },
      { char: '📷', name: 'camera camera fotográfica foto fotografia registrar', tags: ['camera', 'photo', 'picture', 'camera', 'foto'] },
      { char: '🔍', name: 'lupa magnifying glass pesquisar buscar zoom encontrar', tags: ['search', 'find', 'zoom', 'lupa', 'pesquisa', 'buscar'] },
      { char: '🔨', name: 'martelo hammer ferramenta consertar obra construcao', tags: ['tool', 'hammer', 'build', 'martelo', 'ferramenta'] },
      { char: '🔧', name: 'chave de fenda wrench ferramenta inglesa mecânico conserto', tags: ['tool', 'wrench', 'fix', 'chave', 'ferramenta'] },
      { char: '🔑', name: 'chave key abrir segredo cadeado trancar', tags: ['key', 'lock', 'secret', 'chave', 'abrir'] },
      { char: '📦', name: 'caixa papelao package correio encomenda entrega box', tags: ['box', 'package', 'mail', 'caixa', 'encomenda'] },
      { char: '✉️', name: 'envelope carta envelope e-mail correio mensagem', tags: ['mail', 'letter', 'email', 'carta', 'envelope'] },
      { char: '📝', name: 'bloco de notas memo lapis anotar escrever post-it', tags: ['memo', 'write', 'paper', 'anotacao', 'escrever'] },
      { char: '📅', name: 'calendario calendar data compromisso agenda dia', tags: ['calendar', 'date', 'agenda', 'calendario'] },
      { char: '📎', name: 'clips paperclip escritório papel prender organizar', tags: ['paperclip', 'office', 'clips', 'escritorio'] },
      { char: '💵', name: 'nota de dolar dollar bill dinheiro bufunfa verdinhas', tags: ['money', 'cash', 'dollar', 'dinheiro', 'dolar'] },
      { char: '🪙', name: 'moeda coin dinheiro metal centavos troco', tags: ['money', 'coin', 'moeda', 'dinheiro'] },
      { char: '📚', name: 'livros books estudar leitura biblioteca escola sabedoria', tags: ['books', 'read', 'library', 'livros', 'estudar'] },
      { char: '📖', name: 'livro aberto open book ler leitura sabedoria', tags: ['book', 'read', 'livro', 'ler'] },
      { char: '🗑️', name: 'lixeira wastebasket lixo descartar apagar remover', tags: ['trash', 'garbage', 'bin', 'lixeira', 'lixo'] },
      { char: '🛒', name: 'carrinho de compras shopping cart mercado comprar loja', tags: ['shop', 'cart', 'market', 'carrinho', 'compras'] },
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols & Flags',
    icon: '🔣',
    emojis: [
      { char: '❤️', name: 'coracao vermelho red heart amor paixao amar', tags: ['love', 'heart', 'romance', 'amor', 'coracao'] },
      { char: '💔', name: 'coracao partido broken heart triste término sofrimento', tags: ['heart', 'broken', 'sad', 'triste', 'partido'] },
      { char: '💕', name: 'dois coracoes two hearts amor romance carinho', tags: ['love', 'hearts', 'affection', 'coracoes'] },
      { char: '☮️', name: 'simbolo da paz peace symbol pacifismo tranquilidade', tags: ['peace', 'symbol', 'paz', 'simbolo'] },
      { char: '⚠️', name: 'aviso warning atencao perigo cuidado placa amarela', tags: ['warning', 'alert', 'danger', 'aviso', 'atencao', 'perigo'] },
      { char: '✅', name: 'check verde check mark ok correto aprovado feito', tags: ['check', 'yes', 'ok', 'correto', 'aprovado', 'feito'] },
      { char: '❌', name: 'xis vermelho cross mark erro errado cancelar proibido', tags: ['cross', 'no', 'error', 'errado', 'proibido', 'xis'] },
      { char: '🚫', name: 'proibido prohibited entrada proibida nao permitido', tags: ['prohibit', 'no', 'ban', 'proibido', 'nao'] },
      { char: '❗', name: 'exclamacao vermelha exclamation mark atencao alerta importante', tags: ['exclamation', 'alert', 'atencao', 'importante'] },
      { char: '❓', name: 'interrogacao vermelha question mark duvida pergunta o que', tags: ['question', 'doubt', 'pergunta', 'duvida'] },
      { char: '💤', name: 'sono zzz dormir dormindo cansado', tags: ['sleep', 'zzz', 'sono', 'dormir'] },
      { char: '➕', name: 'mais plus simbolo matematica somar adicionar', tags: ['math', 'plus', 'add', 'mais', 'soma'] },
      { char: '➖', name: 'menos minus simbolo matematica subtrair retirar', tags: ['math', 'minus', 'subtract', 'menos'] },
      { char: '✖️', name: 'multiplicacao multiply simbolo matematica multiplicar vezes', tags: ['math', 'multiply', 'vezes'] },
      { char: '➗', name: 'divisao division simbolo matematica dividir', tags: ['math', 'divide', 'divisao'] },
      { char: '♾️', name: 'infinito infinity para sempre eterno', tags: ['infinity', 'forever', 'infinito'] },
      { char: '🏁', name: 'bandeira quadriculada checkered flag corrida final linha chegada', tags: ['flag', 'race', 'chegada', 'corrida', 'bandeira'] },
      { char: '🚩', name: 'bandeira vermelha triangular flag perigo alerta marcação', tags: ['flag', 'red', 'alerta', 'bandeira'] },
      { char: '🇧🇷', name: 'bandeira do brasil brazil flag brasileira br verde amarelo', tags: ['flag', 'brazil', 'brasil', 'bandeira'] },
      { char: '🇺🇸', name: 'bandeira dos estados unidos united states flag usa eua', tags: ['flag', 'usa', 'eua', 'bandeira'] },
    ]
  }
];

// Flat list for searching
const ALL_EMOJIS = EMOJI_CATEGORIES.reduce((acc, cat) => {
  return [...acc, ...cat.emojis];
}, []);

export default function EmojiPicker({ onSelect, onClose }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const pickerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Clean/reset search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Filter emojis based on search
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();
    
    const matches = ALL_EMOJIS.filter(e => {
      const nameMatch = e.name.toLowerCase().includes(query);
      const tagMatch = e.tags.some(tag => tag.toLowerCase().includes(query));
      return nameMatch || tagMatch;
    });

    const uniqueMatches = [];
    const seen = new Set();
    for (const match of matches) {
      if (!seen.has(match.char)) {
        seen.add(match.char);
        uniqueMatches.push(match);
      }
    }
    return uniqueMatches;
  }, [searchQuery]);

  const activeCategoryEmojis = useMemo(() => {
    const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory);
    return cat ? cat.emojis : [];
  }, [activeCategory]);

  return (
    <div className="emoji-picker-popover glass-panel" ref={pickerRef}>
      {/* Header Search Area */}
      <div className="emoji-picker-search-container">
        <Search size={15} className="emoji-picker-search-icon" />
        <input
          type="text"
          className="emoji-picker-search-input"
          placeholder={t('search_emoji_placeholder') || 'Pesquisar emoji...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {searchQuery && (
          <button className="emoji-picker-clear-btn" onClick={handleClearSearch}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Emoji Area */}
      <div className="emoji-picker-grid-scroll">
        {searchQuery.trim() ? (
          filteredEmojis.length > 0 ? (
            <div className="emoji-picker-grid">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`search-${index}`}
                  className="emoji-item-btn"
                  title={emoji.name}
                  onClick={() => onSelect(emoji.char)}
                >
                  {emoji.char}
                </button>
              ))}
            </div>
          ) : (
            <div className="emoji-picker-no-results">
              {t('no_emojis_found') || 'Nenhum emoji encontrado'}
            </div>
          )
        ) : (
          <div>
            <div className="emoji-picker-category-title">
              {EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.name}
            </div>
            <div className="emoji-picker-grid">
              {activeCategoryEmojis.map((emoji, index) => (
                <button
                  key={`${activeCategory}-${index}`}
                  className="emoji-item-btn"
                  title={emoji.name}
                  onClick={() => onSelect(emoji.char)}
                >
                  {emoji.char}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Selection Tabs (Bottom Bar, like WhatsApp) */}
      {!searchQuery.trim() && (
        <div className="emoji-picker-tabs-bar">
          {EMOJI_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`emoji-picker-tab-btn ${activeCategory === category.id ? 'active' : ''}`}
              title={category.name}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
