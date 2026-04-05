"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Sparkles, Brain, BookOpen, ChevronRight, ChevronLeft, RefreshCw, Volume2, Trophy, Bookmark, Link2, GitCompare, GitMerge } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { saveQuestion, deleteSavedQuestion, getSavedQuestions, normalizeSubject } from "@/lib/firestore";
import { safeText, toDirectFileUrl as toDirectImageUrl } from "@/lib/utils";

const allVocabPool = [
  { word: "Abstain", meaning: "To restrain oneself from doing or enjoying something", root: "abs- (away) + tenere (to hold)", synonyms: ["refrain", "desist", "forgo"], antonyms: ["indulge", "consume"], example: "Members of the opposition decided to abstain from voting on the controversial bill.", image: "/vocab/abstain.webp" },
  { word: "Benevolent", meaning: "Well-meaning and kindly; serving a charitable rather than a profit-making purpose", root: "bene (well) + velle (to wish)", synonyms: ["altruistic", "philanthropic", "kind"], antonyms: ["malevolent", "spiteful"], example: "The benevolent donor provided funds to build a new library for the underprivileged children.", image: "/vocab/benevolent.webp" },
  { word: "Abate", meaning: "Become less intense or widespread", root: "ad- (to/at) + battere (to beat)", synonyms: ["diminish", "subside", "lessen"], antonyms: ["intensify", "increase"], example: "The storm suddenly abated.", image: "/vocab/abate.webp" },
  { word: "Cacophony", meaning: "A harsh, discordant mixture of sounds", root: "kakos (bad) + phone (sound)", synonyms: ["noise", "discord", "dissonance"], antonyms: ["harmony", "silence"], example: "A cacophony of deafening alarm bells.", image: "/vocab/cacophony.webp" },
  { word: "Ebullient", meaning: "Cheerful and full of energy", root: "ebullire (to boil over)", synonyms: ["exuberant", "buoyant", "joyful"], antonyms: ["depressed", "apathetic"], example: "She sounded ebullient and happy.", image: "/vocab/ebullient.webp" },
  { word: "Fastidious", meaning: "Very attentive to and concerned about accuracy and detail", root: "fastidium (loathing, squeamishness)", synonyms: ["meticulous", "scrupulous", "punctilious"], antonyms: ["careless", "sloppy"], example: "He chooses his words with fastidious care.", image: "/vocab/fastidious.webp" },
  { word: "Garrulous", meaning: "Excessively talkative, especially on trivial matters", root: "garrire (to chatter)", synonyms: ["loquacious", "voluble", "chatty"], antonyms: ["taciturn", "reticent"], example: "A garrulous cab driver.", image: "/vocab/garrulous.webp" },
  { word: "Hapless", meaning: "Unfortunate and deserving pity", root: "hap (luck) + -less (without)", synonyms: ["unlucky", "ill-fated", "cursed"], antonyms: ["lucky", "fortunate"], example: "The hapless passengers were stranded.", image: "/vocab/hapless.webp" },
  { word: "Iconoclast", meaning: "Someone who attacks cherished beliefs or institutions", root: "eikon (image) + klan (to break)", synonyms: ["critic", "skeptic", "rebel"], antonyms: ["conformist", "believer"], example: "An iconoclast who challenged the status quo.", image: "/vocab/iconoclast.webp" },
  { word: "Juxtapose", meaning: "Place or deal with close together for contrasting effect", root: "juxta (next) + poser (to place)", synonyms: ["compare", "contrast"], antonyms: ["separate", "disconnect"], example: "Black and white photos juxtaposed.", image: "/vocab/juxtapose.webp" },
  { word: "Lethargic", meaning: "Sluggish and apathetic", root: "lethe (forgetfulness)", synonyms: ["sluggish", "inert", "inactive"], antonyms: ["vigorous", "energetic"], example: "I felt tired and lethargic.", image: "/vocab/lethargic.webp" },
  { word: "Malleable", meaning: "Easily influenced; pliable", root: "malleus (a hammer)", synonyms: ["pliable", "ductile", "adaptable"], antonyms: ["rigid", "intractable"], example: "Anna was shaken enough to be malleable.", image: "/vocab/malleable.webp" },
  { word: "Nefarious", meaning: "Wicked or criminal", root: "nefas (wrong, crime)", synonyms: ["wicked", "evil", "heinous"], antonyms: ["righteous", "good"], example: "The nefarious activities of the syndicate.", image: "/vocab/nefarious.webp" },
  { word: "Obfuscate", meaning: "Render obscure, unclear, or unintelligible", root: "ob- (over) + fuscus (dark)", synonyms: ["confuse", "complicate", "blur"], antonyms: ["clarify", "illuminate"], example: "The spelling changes obfuscate their origins.", image: "/vocab/obfuscate.webp" },
  { word: "Paradigm", meaning: "A typical example or pattern of something; a model", root: "para- (beside) + deiknunai (to show)", synonyms: ["model", "pattern", "standard"], antonyms: ["anomaly", "exception"], example: "There is a new paradigm for public art.", image: "/vocab/paradigm.webp" },
  { word: "Quixotic", meaning: "Exceedingly idealistic; unrealistic and impractical", root: "From 'Don Quixote' (fictional character)", synonyms: ["idealistic", "romantic", "visionary"], antonyms: ["pragmatic", "practical"], example: "A vast and perhaps quixotic project.", image: "/vocab/quixotic.webp" },
  { word: "Resilient", meaning: "Able to withstand or recover quickly from difficult conditions", root: "re- (back) + salire (to jump)", synonyms: ["tough", "strong", "adaptable"], antonyms: ["vulnerable", "fragile"], example: "Babies are generally far more resilient.", image: "/vocab/resilient.webp" },
  { word: "Ameliorate", meaning: "Make something bad better", root: "a- (to/at) + melior (better)", synonyms: ["improve", "enhance", "better"], antonyms: ["worsen", "exacerbate"], example: "Strategies to ameliorate poor living conditions.", emoji: "🩹" },
  { word: "Chicanery", meaning: "The use of trickery to achieve a political, financial, or legal purpose", root: "chicaner (to quibble)", synonyms: ["trickery", "deception", "deceit"], antonyms: ["honesty", "candor"], example: "He resorted to chicanery to win the vote.", emoji: "🃏" },
  { word: "Diffident", meaning: "Modest or shy because of a lack of self-confidence", root: "dis- (not) + fidere (to trust)", synonyms: ["shy", "bashful", "modest"], antonyms: ["confident", "bold"], example: "A diffident youth.", emoji: "🙈" },
  { word: "Enervate", meaning: "Cause someone to feel drained of energy or vitality", root: "ex- (out) + nervus (sinew, nerve)", synonyms: ["exhaust", "tire", "weary"], antonyms: ["energize", "invigorate"], example: "The heat enervated us all.", emoji: "🪫" },
  { word: "Frugal", meaning: "Sparing or economical with regard to money or food", root: "frugi (thrifty)", synonyms: ["thrifty", "economical", "sparing"], antonyms: ["extravagant", "wasteful"], example: "He led a frugal life.", emoji: "🪙" },
  { word: "Gregarious", meaning: "Fond of company; sociable", root: "grex (a flock)", synonyms: ["sociable", "outgoing", "friendly"], antonyms: ["unsociable", "reserved"], example: "He was a popular and gregarious man.", emoji: "🤝" },
  { word: "Inchoate", meaning: "Just begun and so not fully formed or developed; rudimentary", root: "in- (into) + cohum (the strap on a plow)", synonyms: ["rudimentary", "undeveloped", "immature"], antonyms: ["developed", "mature"], example: "A still inchoate democracy.", emoji: "🌱" },
  { word: "Mendacious", meaning: "Not telling the truth; lying", root: "menda (a fault)", synonyms: ["lying", "untruthful", "dishonest"], antonyms: ["truthful", "honest"], example: "Mendacious propaganda.", emoji: "🤥" },
  { word: "Obsequious", meaning: "Obedient or attentive to an excessive or servile degree", root: "ob- (after) + sequi (to follow)", synonyms: ["servile", "sycohpantic", "fawning"], antonyms: ["domineering", "arrogant"], example: "They were served by obsequious waiters.", emoji: "🙇" },
  { word: "Paucity", meaning: "The presence of something only in small or insufficient quantities or amounts", root: "paucus (few)", synonyms: ["scarcity", "shortage", "dearth"], antonyms: ["abundance", "plenty"], example: "A paucity of information.", emoji: "🤏" },
  { word: "Reticent", meaning: "Not revealing one's thoughts or feelings readily", root: "re- (intensive) + tacere (to be silent)", synonyms: ["reserved", "withdrawn", "introverted"], antonyms: ["expansive", "garrulous"], example: "She was extremely reticent about her personal life.", emoji: "🤐" },
  { word: "Soporific", meaning: "Tending to induce drowsiness or sleep", root: "sopor (deep sleep)", synonyms: ["sleep-inducing", "somniferous"], antonyms: ["invigorating", "stimulating"], example: "The motion of the train had a soporific effect.", emoji: "💤" },
  { word: "Transient", meaning: "Lasting only for a short time; impermanent", root: "transire (to go across)", synonyms: ["fleeting", "short-lived", "momentary"], antonyms: ["permanent", "enduring"], example: "A transient cold spell.", emoji: "🌬️" },
  { word: "Verbose", meaning: "Using or expressed in more words than are needed", root: "verbum (a word)", synonyms: ["wordy", "loquacious", "garrulous"], antonyms: ["laconic", "concise"], example: "A verbose explanation.", emoji: "📖" },
  { word: "Wary", meaning: "Feeling or showing caution about possible dangers or problems", root: "waru (guard)", synonyms: ["cautious", "careful", "chary"], antonyms: ["unwary", "reckless"], example: "Dogs that are wary of strangers.", emoji: "🛡️" },
  { word: "Alacrity", meaning: "Brisk and cheerful readiness", root: "alacer (lively)", synonyms: ["eagerness", "willingness", "readiness"], antonyms: ["apathy", "reluctance"], example: "She accepted the invitation with alacrity.", emoji: "💨" },
  { word: "Clandestine", meaning: "Kept secret or done secretively", root: "clam (secretly)", synonyms: ["secret", "covert", "surreptitious"], antonyms: ["open", "public"], example: "A clandestine meeting.", emoji: "🕵️" },
  { word: "Equivocal", meaning: "Open to more than one interpretation; ambiguous", root: "aequus (equal) + vox (voice)", synonyms: ["ambiguous", "vague", "uncertain"], antonyms: ["clear", "unequivocal"], example: "The results were equivocal.", emoji: "❓" },
  { word: "Innocuous", meaning: "Not harmful or offensive", root: "in- (not) + nocuus (harmful)", synonyms: ["harmless", "safe", "nontoxic"], antonyms: ["harmful", "toxic"], example: "It was an innocuous question.", emoji: "🕊️" },
  { word: "Loquacious", meaning: "Tending to talk a great deal; talkative", root: "loqui (to speak)", synonyms: ["talkative", "garrulous", "chatty"], antonyms: ["silent", "taciturn"], example: "Never loquacious, Sarah was now totally silent.", emoji: "💬" },
  { word: "Abundant", meaning: "Existing or available in large quantities; plentiful", root: "ab- (from) + undare (to surge)", synonyms: ["plentiful", "ample", "bountiful"], antonyms: ["scarce", "scant"], example: "There is abundant evidence of climate change.", emoji: "🌽" },
  { word: "Adamant", meaning: "Refusing to be persuaded or to change one's mind", root: "a- (not) + daman (to tame)", synonyms: ["unshakable", "immovable", "insistent"], antonyms: ["flexible", "compliant"], example: "He is adamant that he is not going to resign.", emoji: "🏔️" },
  { word: "Adverse", meaning: "Preventing success or development; harmful; unfavorable", root: "ad- (to) + vertere (to turn)", synonyms: ["unfavorable", "disadvantageous", "harmful"], antonyms: ["favorable", "beneficial"], example: "Adverse weather conditions.", emoji: "🌪️" },
  { word: "Affluence", meaning: "The state of having a great deal of money; wealth", root: "ad- (to) + fluere (to flow)", synonyms: ["wealth", "prosperity", "opulence"], antonyms: ["poverty", "penury"], example: "A sign of growing affluence.", emoji: "💎" },
  { word: "Agile", meaning: "Able to move quickly and easily", root: "agere (to do)", synonyms: ["nimble", "lithe", "supple"], antonyms: ["clumsy", "stiff"], example: "Ruth was as agile as a monkey.", emoji: "🤸" },
  { word: "Ambiguous", meaning: "Open to more than one interpretation; not having one obvious meaning", root: "ambi- (both ways) + agere (to drive)", synonyms: ["equivocal", "vague", "unclear"], antonyms: ["clear", "unambiguous"], example: "The election result was ambiguous.", emoji: "🎭" },
  { word: "Annihilate", meaning: "Destroy utterly; obliterate", root: "ad- (to) + nihil (nothing)", synonyms: ["obliterate", "destroy", "decimate"], antonyms: ["create", "build"], example: "The village was annihilated by the bombing.", emoji: "💥" },
  { word: "Antipathy", meaning: "A deep-seated feeling of aversion", root: "anti- (against) + pathos (feeling)", synonyms: ["hostility", "animosity", "aversion"], antonyms: ["affinity", "liking"], example: "A fundamental antipathy between the two men.", emoji: "🚫" },
  { word: "Archaic", meaning: "Very old or old-fashioned", root: "arkhaios (ancient)", synonyms: ["obsolete", "antique", "ancient"], antonyms: ["modern", "contemporary"], example: "The system is archaic and needs reform.", emoji: "🏺" },
  { word: "Arduous", meaning: "Involving or requiring strenuous effort; difficult and tiring", root: "arduus (steep)", synonyms: ["strenuous", "taxing", "laborious"], antonyms: ["easy", "effortless"], example: "An arduous journey.", emoji: "🧗" },
  { word: "Ascend", meaning: "Go up or climb", root: "ad- (to) + scandere (to climb)", synonyms: ["climb", "mount", "soar"], antonyms: ["descend", "fall"], example: "She ascended the stairs.", emoji: "📈" },
  { word: "Astute", meaning: "Having or showing an ability to accurately assess situations or people and turn this to one's advantage", root: "astus (craft)", synonyms: ["shrewd", "sharp", "clever"], antonyms: ["stupid", "naive"], example: "An astute businessman.", emoji: "🦉" },
  { word: "Audacious", meaning: "Showing a willingness to take surprisingly bold risks", root: "audax (bold)", synonyms: ["bold", "daring", "fearless"], antonyms: ["timid", "cautious"], example: "An audacious plan.", emoji: "🦁" },
  { word: "Auspicious", meaning: "Conducive to success; favorable", root: "avis (bird) + specere (to look)", synonyms: ["favorable", "promising", "propitious"], antonyms: ["inauspicious", "unlucky"], example: "It was an auspicious beginning to his career.", emoji: "🍀" },
  { word: "Austere", meaning: "Severe or strict in manner, attitude, or appearance", root: "austeros (harsh)", synonyms: ["severe", "stern", "strict"], antonyms: ["genial", "luxurious"], example: "An austere outlook on life.", emoji: "📏" },
  { word: "Aversion", meaning: "A strong dislike or disinclination", root: "ab- (from) + vertere (to turn)", synonyms: ["dislike", "antipathy", "loathing"], antonyms: ["liking", "fondness"], example: "He had a deep-seated aversion to dogs.", emoji: "😣" },
  { word: "Banal", meaning: "So lacking in originality as to be obvious and boring", root: "Old French 'ban' (summons)", synonyms: ["trite", "hackneyed", "clichéd"], antonyms: ["original", "fresh"], example: "Songs with banal lyrics.", emoji: "🥱" },
  { word: "Barren", meaning: "Too poor to produce much or any vegetation", root: "Old French 'baraigne'", synonyms: ["unproductive", "infertile", "sterile"], antonyms: ["fertile", "productive"], example: "The plains are barren.", emoji: "🏜️" },
  { word: "Belligerent", meaning: "Hostile and aggressive", root: "bellum (war) + gerere (to wage)", synonyms: ["hostile", "antagonistic", "pugnacious"], antonyms: ["peaceful", "friendly"], example: "A bull-necked, belligerent old man.", emoji: "🥊" },
  { word: "Blasphemous", meaning: "Sacrilegious against God or sacred things; profane", root: "blasphemos (profane)", synonyms: ["profane", "sacrilegious", "impious"], antonyms: ["reverent", "pious"], example: "Blasphemous jokes.", emoji: "🤐" },
  { word: "Boisterous", meaning: "Noisy, energetic, and cheerful; rowdy", root: "Middle English 'boistous' (rough, violent)", synonyms: ["unruly", "rowdy", "clamorous"], antonyms: ["quiet", "restrained"], example: "A boisterous group of children.", emoji: "🎉" },
  { word: "Bombastic", meaning: "High-sounding but with little meaning; inflated", root: "bombax (cotton, padding)", synonyms: ["pompous", "turgid", "inflated"], antonyms: ["straightforward", "simple"], example: "Bombastic rhetoric.", emoji: "🎈" },
  { word: "Brevity", meaning: "Concise and exact use of words in writing or speech", root: "brevis (short)", synonyms: ["conciseness", "concision", "succinctness"], antonyms: ["verbosity", "prolixity"], example: "The brevity of human life.", emoji: "✂️" },
  { word: "Brittle", meaning: "Hard but liable to break or shatter easily", root: "breotan (to break)", synonyms: ["fragile", "delicate", "crisp"], antonyms: ["flexible", "tough"], example: "Brittle bones.", emoji: "🦴" },
  { word: "Callous", meaning: "Showing or having an insensitive and cruel disregard for others", root: "callus (hard skin)", synonyms: ["heartless", "unfeeling", "cruel"], antonyms: ["kind", "compassionate"], example: "A callous disregard for help.", emoji: "🖤" },
  { word: "Candid", meaning: "Truthful and straightforward; frank", root: "candere (to shine)", synonyms: ["frank", "forthright", "open"], antonyms: ["secretive", "guarded"], example: "His responses were remarkably candid.", emoji: "📸" },
  { word: "Captivating", meaning: "Capable of attracting and holding interest; charming", root: "capere (to take)", synonyms: ["charming", "enchanting", "fascinating"], antonyms: ["boring", "repellent"], example: "A captivating smile.", emoji: "✨" },
  { word: "Censure", meaning: "Express severe disapproval of (someone or something), typically in a formal statement", root: "censere (to assess)", synonyms: ["condemn", "criticize", "reprimand"], antonyms: ["praise", "commend"], example: "A judge was censured in 1983.", emoji: "🔨" },
  { word: "Chaos", meaning: "Complete disorder and confusion", root: "khaos (vast chasm)", synonyms: ["disorder", "confusion", "anarchy"], antonyms: ["order", "peace"], example: "The capital was in chaos.", emoji: "🌀" },
  { word: "Charismatic", meaning: "Exercising a compelling charm which inspires devotion in others", root: "kharisma (favor, divine gift)", synonyms: ["charming", "magnetic", "appealing"], antonyms: ["uninspiring", "repellent"], example: "A charismatic leader.", emoji: "🌟" },
  { word: "Chronological", meaning: "Starting with the earliest and following the order in which they occurred", root: "khronos (time) + logos (word)", synonyms: ["sequential", "consecutive"], antonyms: ["random", "unordered"], example: "The entries are in chronological order.", emoji: "📅" },
  { word: "Circumspect", meaning: "Wary and unwilling to take risks", root: "circum- (around) + specere (to look)", synonyms: ["cautious", "wary", "careful"], antonyms: ["unguarded", "reckless"], example: "The officials were very circumspect.", emoji: "🔍" },
  { word: "Coherent", meaning: "Logical and consistent", root: "co- (together) + haerere (to stick)", synonyms: ["logical", "reasoned", "rational"], antonyms: ["incoherent", "confused"], example: "A coherent argument.", emoji: "🧩" },
  { word: "Collaborate", meaning: "Work jointly on an activity, especially to produce or create something", root: "co- (together) + laborare (to work)", synonyms: ["cooperate", "combine"], antonyms: ["compete", "clash"], example: "He collaborated with a colleague.", emoji: "🤝" },
  { word: "Compassion", meaning: "Sympathetic pity and concern for the sufferings or misfortunes of others", root: "co- (with) + pati (to suffer)", synonyms: ["pity", "sympathy", "empathy"], antonyms: ["indifference", "cruelty"], example: "Filled with compassion for the victims.", emoji: "❤️" },
  { word: "Complacency", meaning: "A feeling of smug or uncritical satisfaction with oneself or one's achievements", root: "complacere (to please)", synonyms: ["smugness", "self-satisfaction"], antonyms: ["dissatisfaction", "humility"], example: "The figures are no reason for complacency.", emoji: "😌" },
  { word: "Concise", meaning: "Giving a lot of information clearly and in a few words; brief but comprehensive", root: "con- (completely) + caedere (to cut)", synonyms: ["succinct", "short", "brief"], antonyms: ["wordy", "prolix"], example: "A concise summary.", emoji: "📝" },
  { word: "Condense", meaning: "Make more concentrated or packed", root: "con- (together) + densus (thick)", synonyms: ["compress", "compact"], antonyms: ["expand", "dilute"], example: "The report was condensed.", emoji: "📦" },
  { word: "Confluence", meaning: "The junction of two rivers, especially rivers of approximately equal width", root: "con- (together) + fluere (to flow)", synonyms: ["convergence", "junction", "meeting"], antonyms: ["divergence", "separation"], example: "A confluence of rivers.", emoji: "🌊" },
  { word: "Conjecture", meaning: "An opinion or conclusion formed on the basis of incomplete information", root: "con- (together) + jacere (to throw)", synonyms: ["guess", "surmise", "speculation"], antonyms: ["fact", "proof"], example: "Conjectures about the future.", emoji: "💭" },
  { word: "Conscientious", meaning: "Wishing to do what is right, especially to do one's work or duty well and thoroughly", root: "con- (with) + scire (to know)", synonyms: ["diligent", "industrious", "punctilious"], antonyms: ["careless", "lazy"], example: "A conscientious agent.", emoji: "👨‍💻" },
  { word: "Consensus", meaning: "General agreement", root: "con- (together) + sentire (to feel)", synonyms: ["agreement", "harmony", "concord"], antonyms: ["disagreement", "dissent"], example: "A consensus of opinion.", emoji: "🗳️" },
  { word: "Consolidate", meaning: "Make physically stronger or more solid", root: "con- (together) + solidare (to make solid)", synonyms: ["strengthen", "secure", "stabilize"], antonyms: ["weaken", "separate"], example: "Consolidate your gains.", emoji: "🏗️" },
  { word: "Conspicuous", meaning: "Standing out so as to be clearly visible", root: "con- (completely) + specere (to look)", synonyms: ["noticeable", "obvious", "visible"], antonyms: ["inconspicuous", "hidden"], example: "He was very conspicuous.", emoji: "🚩" },
  { word: "Contempt", meaning: "The feeling that a person or a thing is beneath consideration, worthless, or deserving scorn", root: "con- (intensive) + temnere (to despise)", synonyms: ["scorn", "disdain", "disrespect"], antonyms: ["respect", "admiration"], example: "Contempt for the law.", emoji: "🙄" },
  { word: "Contiguous", meaning: "Sharing a common border; touching", root: "con- (together) + tangere (to touch)", synonyms: ["adjacent", "neighboring", "bordering"], antonyms: ["distant", "separated"], example: "The contiguous states.", emoji: "🗺️" },
  { word: "Contingent", meaning: "Subject to chance", root: "con- (together) + tangere (to touch)", synonyms: ["dependent", "conditional"], antonyms: ["certain", "independent"], example: "Contingent on success.", emoji: "🎲" },
  { word: "Contradiction", meaning: "A combination of statements, ideas, or features which are opposed to one another", root: "contra- (against) + dicere (to speak)", synonyms: ["conflict", "clash", "discrepancy"], antonyms: ["agreement", "consistency"], example: "A direct contradiction.", emoji: "⚖️" },
  { word: "Convivial", meaning: "Cheerful and friendly; jovial", root: "con- (together) + vivere (to live)", synonyms: ["sociable", "jovial", "friendly"], antonyms: ["unsociable", "gloomy"], example: "A convivial host.", emoji: "🥂" },
  { word: "Copious", meaning: "Abundant in supply or quantity", root: "copia (plenty)", synonyms: ["abundant", "plentiful", "ample"], antonyms: ["sparse", "scarce"], example: "Copious notes.", emoji: "📚" },
  { word: "Corroborate", meaning: "Confirm or give support to (a statement, theory, or finding)", root: "con- (together) + robur (strength)", synonyms: ["confirm", "verify", "support"], antonyms: ["contradict", "disprove"], example: "The witness corroborated the story.", emoji: "🤝" },
  { word: "Credulous", meaning: "Having or showing too great a readiness to believe things", root: "credere (to believe)", synonyms: ["gullible", "naive", "impressionable"], antonyms: ["skeptical", "suspicious"], example: "A credulous nature.", emoji: "👶" },
  { word: "Cryptic", meaning: "Having a meaning that is mysterious or obscure", root: "kruptos (hidden)", synonyms: ["mysterious", "enigmatic", "obscure"], antonyms: ["clear", "obvious"], example: "A cryptic message.", emoji: "🔐" },
  { word: "Culpable", meaning: "Deserving blame", root: "culpa (fault, blame)", synonyms: ["guilty", "to blame", "responsible"], antonyms: ["innocent", "blameless"], example: "He was held culpable.", emoji: "⚖️" },
  { word: "Cursory", meaning: "Hasty and therefore not thorough or detailed", root: "currere (to run)", synonyms: ["hasty", "perfunctory", "brief"], antonyms: ["thorough", "detailed"], example: "A cursory glance.", emoji: "🏃" },
  { word: "Dearth", meaning: "A scarcity or lack of something", root: "Middle English 'derthe'", synonyms: ["scarcity", "shortage", "paucity"], antonyms: ["abundance", "surfeit"], example: "A dearth of talent.", emoji: "🌵" },
  { word: "Debilitate", meaning: "Make (someone) very weak and infirm", root: "de- (away) + bilis (strength)", synonyms: ["weaken", "enfeeble", "exhaust"], antonyms: ["strengthen", "invigorate"], example: "A debilitating disease.", emoji: "🤒" },
  { word: "Decorous", meaning: "In keeping with good taste and propriety; polite and restrained", root: "decor (beauty, elegance)", synonyms: ["proper", "appropriate", "refined"], antonyms: ["indecorous", "unrefined"], example: "Decorous behavior.", emoji: "🎩" },
  { word: "Defame", meaning: "Damage the good reputation of", root: "de- (away) + fama (reputation)", synonyms: ["libel", "slander", "malign"], antonyms: ["praise", "exalt"], example: "He was defamed.", emoji: "🗣️" },
  { word: "Deference", meaning: "Polite submission and respect", root: "de- (away) + ferre (to carry)", synonyms: ["respect", "esteem", "regard"], antonyms: ["disrespect", "contempt"], example: "Deference to authority.", emoji: "🙇" },
  { word: "Deleterious", meaning: "Causing harm or damage", root: "deleisthai (to hurt)", synonyms: ["harmful", "damaging", "detrimental"], antonyms: ["beneficial", "helpful"], example: "Deleterious effects.", emoji: "☣️" }
];

// Expanded AI generated data pool for Grammar
const allGrammarPool = [
  { rule: "Subject-Verb Agreement", detail: "Two singular subjects connected by 'or', 'either/or', or 'neither/nor' require a singular verb.", example: "Neither John nor Carmen IS available." },
  { rule: "Use of 'Less' vs 'Fewer'", detail: "Use 'fewer' for countable nouns and 'less' for uncountable nouns.", example: "Fewer birds came this year. I have less time to study." },
  { rule: "Dangling Modifiers", detail: "A modifier must stay close to the word it modifies; otherwise, it is dangling.", example: "(Incorrect) Hoping to excuse the absence, the note was written.\n(Correct) Hoping to excuse the absence, the mother wrote the note." },
  { rule: "Past Perfect Tense", detail: "Use to show that one past action happened before another past action.", example: "I had finished my homework before the movie started." },
  { rule: "Pronoun-Antecedent Agreement", detail: "A pronoun must agree in number and gender with its antecedent.", example: "Every student must bring his or her own lunch." },
  { rule: "Comma Splice", detail: "Do not join two independent clauses with only a comma; use a semicolon or conjunction.", example: "I love cats; I have three." },
  { rule: "Who vs Whom", detail: "Use 'who' for subjects and 'whom' for objects of a verb or preposition.", example: "Who is at the door? To whom should I give this letter?" },
  { rule: "Affect vs Effect", detail: "'Affect' is usually a verb meaning to influence; 'effect' is usually a noun meaning result.", example: "The weather affects my mood. The effect of the storm was devastating." },
  { rule: "Its vs It's", detail: "'Its' is possessive; 'It's' is a contraction of 'it is'.", example: "The dog chased its tail. It's a beautiful day." },
  { rule: "Parallelism", detail: "Use the same grammatical structure for similar items in a list.", example: "She likes hiking, swimming, and running." },
  { rule: "Gerunds vs Infinitives", detail: "Certain verbs are followed by gerunds (verb+ing), others by infinitives (to+verb).", example: "I enjoy swimming (gerund). I want to swim (infinitive)." },
  { rule: "Active vs Passive Voice", detail: "In active voice, the subject acts upon the verb. Passive voice uses 'to be' + past participle.", example: "(Active) The dog ate the homework. (Passive) The homework was eaten by the dog." },
  { rule: "Lie vs Lay", detail: "'Lie' means to rest or recline (intransitive). 'Lay' means to put or place (transitive).", example: "I am going to lie down. I will lay the book on the table." },
  { rule: "A vs An", detail: "Use 'A' before consonants sounds, use 'An' before vowel sounds.", example: "An hour ago, I saw a unicorn." },
  { rule: "Bring vs Take", detail: "Use 'bring' for movement toward the speaker. Use 'take' for movement away from speaker.", example: "Bring me the pen. Take this pen to the other room." },
  { rule: "Farther vs Further", detail: "'Farther' refers to physical distance. 'Further' refers to metaphorical or figurative distance.", example: "She ran farther than me. Let's discuss this further." },
  { rule: "To, Too, Two", detail: "To = preposition/infinitive. Too = excessively/also. Two = number 2.", example: "We are going to the park too, joining the two of you." },
  { rule: "Your vs You're", detail: "'Your' is possessive. 'You're' is a contraction for 'you are'.", example: "You're taking your dog for a walk." },
  { rule: "Which vs That", detail: "'That' is for essential clauses (no commas). 'Which' is for non-essential clauses (uses commas).", example: "The book that I read was good. The book, which is red, was good." },
  { rule: "Their, There, They're", detail: "Their = possessive. There = location. They're = they are.", example: "They're going to put their bags over there." },
  { rule: "Conditional Type 0", detail: "Zero conditional used for scientific facts or general truths. (If + present simple, present simple).", example: "If you heat water to 100 degrees, it boils." },
  { rule: "Conditional Type 1", detail: "First conditional used for real and possible situations in the future. (If + present simple, will + verb).", example: "If it rains tomorrow, I will stay at home." },
  { rule: "Conditional Type 2", detail: "Second conditional used for improbable or imaginary situations. (If + past simple, would + verb).", example: "If I won the lottery, I would travel the world." },
  { rule: "Conditional Type 3", detail: "Third conditional used for past situations that didn't happen. (If + past perfect, would have + past participle).", example: "If I had studied harder, I would have passed the exam." },
  { rule: "Inversion for emphasis", detail: "When a sentence starts with a negative adverb, the auxiliary verb comes before the subject.", example: "Never have I seen such a beautiful sunset." },
  { rule: "No sooner... than", detail: "Used to say that one thing happens immediately after another. Use inversion with 'No sooner'.", example: "No sooner had I reached the station than the train left." },
  { rule: "Hardly... when", detail: "Similar to 'No sooner', used for immediate succession. Also uses inversion.", example: "Hardly had the teacher entered the class when the students became silent." },
  { rule: "Each/Every + Singular Verb", detail: "The words 'each', 'every', 'either', and 'neither' are followed by a singular verb.", example: "Each of the students has a unique talent." },
  { rule: "Not only... but also", detail: "The verb must agree with the subject closest to it.", example: "Not only the principal but also the teachers ARE attending the meeting." },
  { rule: "One of the + Plural Noun", detail: "The phrase 'one of the' is followed by a plural noun but a singular verb.", example: "One of my friends is a doctor." },
  { rule: "Many a + Singular Noun", detail: "The phrase 'many a' is followed by a singular noun and a singular verb.", example: "Many a man has sacrificed his life for his country." },
  { rule: "Superior/Senior + To", detail: "Certain adjectives ending in -ior take 'to' instead of 'than' for comparison.", example: "He is senior to me in the office." },
  { rule: "Usage of Lest... should", detail: "'Lest' is followed by 'should' or the base form of the verb, and it never takes 'not'.", example: "Work hard lest you should fail." },
  { rule: "Between vs Among", detail: "Use 'between' for two people/things. Use 'among' for more than two.", example: "Distribute the sweets between the two boys. Divide the property among the four brothers." },
  { rule: "Beside vs Besides", detail: "'Beside' means next to. 'Besides' means in addition to.", example: "He sat beside me. Besides Hindi, he knows English." },
  { rule: "Unless vs Until", detail: "'Unless' refers to a condition. 'Until' refers to time.", example: "You cannot pass unless you work hard. Wait here until I come back." },
  { rule: "Scarcely... when", detail: "Uses inversion for immediate succession, similar to 'hardly'.", example: "Scarcely had I stepped out when it started raining." },
  { rule: "Advice (N) vs Advise (V)", detail: "'Advice' is an uncountable noun. 'Advise' is a verb.", example: "He gave me a piece of advice. I advise you to stay home." },
  { rule: "Stationary vs Stationery", detail: "'Stationary' means not moving. 'Stationery' refers to writing materials.", example: "The car was stationary. I went to buy some stationery." },
  { rule: "Usage of 'One' as Subject", detail: "When 'one' is used as a subject, it must be followed by 'one's' in the possessive case.", example: "One should do one's duty." },
  { rule: "Collective Nouns", detail: "Nouns like 'team', 'jury', 'committee' take a singular verb when acting as a unit, and plural when members act individually.", example: "The jury has given its verdict. The jury were divided in their opinion." },
  { rule: "The relative pronoun 'That'", detail: "Use 'that' after superlatives, only, same, every, all.", example: "This is the best that I can do. All that glitters is not gold." },
  { rule: "Article with Unique Entities", detail: "Use 'the' before things that are unique, like the sun, the moon, the Earth.", example: "The sun rises in the east." },
  { rule: "Tense Sequence", detail: "If the principal clause is in the past tense, the subordinate clause must also be in the past tense.", example: "He said that he was busy." },
  { rule: "Article with Rivers/Oceans", detail: "Use 'the' before names of rivers, seas, oceans, and mountain ranges.", example: "The Ganges is a holy river. The Himalayas are to the north." },
  { rule: "Since vs For", detail: "Use 'since' for a point of time. Use 'for' for a period of time.", example: "I have been living here since 2010. I have been waiting for two hours." },
  { rule: "Hypothetical Subjunctive", detail: "Use 'were' instead of 'was' in hypothetical or imaginary 'if' clauses, regardless of the subject.", example: "If I were a bird, I would fly." },
  { rule: "Redundant Expressions", detail: "Avoid using words with the same meaning together, like 'return back' or 'repeat again'.", example: "(Incorrect) Please return back my book. (Correct) Please return my book." },
  { rule: "Possessive Case with Inanimate Objects", detail: "The possessive 's is generally not used with non-living things. Use 'of' instead.", example: "(Incorrect) The table's legs. (Correct) The legs of the table." },
  { rule: "Usage of 'Would rather'", detail: "Use base form of the verb after 'would rather'.", example: "I would rather die than beg." }
];

export default function VocabGrammarPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"vocab" | "grammar" | "games">("vocab");
  const [currentVocab, setCurrentVocab] = useState<any[]>([]);
  const [currentGrammar, setCurrentGrammar] = useState<any[]>([]);
  const [savedVocabTexts, setSavedVocabTexts] = useState<string[]>([]);
  const [savedGrammarTexts, setSavedGrammarTexts] = useState<string[]>([]);

  // Fetch saved items at the page level
  useEffect(() => {
    if (user) {
      getSavedQuestions(user.uid).then(questions => {
        setSavedVocabTexts(questions.filter(q => q.subject === "Vocabulary").map(q => q.questionText));
        setSavedGrammarTexts(questions.filter(q => q.subject === "Grammar").map(q => q.questionText));
      });
    }
  }, [user]);

  const generateNewSet = () => {
    const shuffle = (array: any[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    
    let seenVocabHistory: string[] = [];
    let seenGrammarHistory: string[] = [];
    let learnedVocab: string[] = [];
    let learnedGrammar: string[] = [];
    
    if (typeof window !== 'undefined') {
      try {
        seenVocabHistory = JSON.parse(localStorage.getItem('vocab_history_v2') || '[]');
        seenGrammarHistory = JSON.parse(localStorage.getItem('grammar_history_v2') || '[]');
        learnedVocab = JSON.parse(localStorage.getItem('learned_vocab_list_v1') || '[]');
        learnedGrammar = JSON.parse(localStorage.getItem('learned_grammar_list_v1') || '[]');
      } catch(e) { /* ignore */ }
    }

    // --- VOCAB LOGIC ---
    let availableVocab = allVocabPool.filter(v => 
      !seenVocabHistory.includes(v.word) && 
      !learnedVocab.includes(v.word) &&
      !savedVocabTexts.includes(v.word)
    );
    
    if (availableVocab.length < 15) {
      seenVocabHistory = [];
      availableVocab = allVocabPool.filter(v => 
        !learnedVocab.includes(v.word) && !savedVocabTexts.includes(v.word)
      );
      if (availableVocab.length < 15) availableVocab = allVocabPool;
    }
    
    const illustratedVocab = shuffle(availableVocab.filter(v => !!v.image));
    const otherVocab = shuffle(availableVocab.filter(v => !v.image));
    const finalVocabSelection = [...illustratedVocab, ...otherVocab].slice(0, 15);
    
    setCurrentVocab(finalVocabSelection);
    const newVocabHistory = [...seenVocabHistory, ...finalVocabSelection.map(v => v.word)];

    // --- GRAMMAR LOGIC ---
    let availableGrammar = allGrammarPool.filter(g => 
      !seenGrammarHistory.includes(g.rule) && 
      !learnedGrammar.includes(g.rule) &&
      !savedGrammarTexts.includes(g.rule)
    );
    
    if (availableGrammar.length < 10) {
      seenGrammarHistory = [];
      availableGrammar = allGrammarPool.filter(g => 
        !learnedGrammar.includes(g.rule) && !savedGrammarTexts.includes(g.rule)
      );
      if (availableGrammar.length < 10) availableGrammar = allGrammarPool;
    }
    
    const finalGrammarSelection = shuffle(availableGrammar).slice(0, 10);
    setCurrentGrammar(finalGrammarSelection);
    const newGrammarHistory = [...seenGrammarHistory, ...finalGrammarSelection.map(g => g.rule)];

    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_history_v2', JSON.stringify(newVocabHistory));
      localStorage.setItem('grammar_history_v1', JSON.stringify(newGrammarHistory));
    }
  };

  useEffect(() => {
    // Generate initial set once saved data is fetched (to ensure filtering works on mount)
    if (savedVocabTexts.length >= 0) {
      generateNewSet();
    }
  }, [savedVocabTexts, savedGrammarTexts]);

  if (currentVocab.length === 0) {
     return <div className="min-h-screen flex items-center justify-center">Loading Content...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Top vocab & grammar rules <Sparkles className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-muted-foreground mt-2">New words and grammar rules generated on every refresh!</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl">
          <TabButton active={activeTab === "vocab"} onClick={() => setActiveTab("vocab")} icon={<BookOpen className="w-4 h-4" />} label="Daily Vocab" />
          <TabButton active={activeTab === "grammar"} onClick={() => setActiveTab("grammar")} icon={<Brain className="w-4 h-4" />} label="Daily Grammar" />
          <TabButton active={activeTab === "games"} onClick={() => setActiveTab("games")} icon={<Trophy className="w-4 h-4" />} label="Play Games" />
        </div>
      </div>

      {activeTab === "vocab" && <VocabSection vocab={currentVocab} onRefresh={generateNewSet} />}
      {activeTab === "grammar" && <GrammarSection grammar={currentGrammar} />}
      {activeTab === "games" && <GamesSection vocab={currentVocab} grammar={currentGrammar} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-background shadow text-primary" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}

function VocabSection({ vocab, onRefresh }: { vocab: any[], onRefresh: () => void }) {
  const { user } = useAuth();
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getSavedQuestions(user.uid).then(questions => {
        setSavedItemIds(questions.filter(q => normalizeSubject(q.subject) === "English").map(q => q.questionId));
      });
    }
    // Load learned words from localStorage
    const stored = localStorage.getItem('learned_vocab_list_v1');
    if (stored) try { setLearnedWords(JSON.parse(stored)); } catch(e) {}
  }, [user]);

  const toggleSave = async (word: any) => {
    // ... same saving logic
    if (!user || isSaving) return;
    
    setIsSaving(true);
    const questionId = `vocab-${word.word.toLowerCase()}`;
    const isSaved = savedItemIds.includes(questionId);
    
    try {
      if (isSaved) {
        await deleteSavedQuestion(user.uid, questionId);
        setSavedItemIds(prev => prev.filter(id => id !== questionId));
      } else {
        await saveQuestion(user.uid, {
          questionId,
          subject: normalizeSubject("English"),
          topic: "Daily Vocab",
          questionText: word.word,
          options: word.synonyms || [],
          correctAnswer: word.meaning,
          userNotes: `Root: ${word.root}`,
          explanation: word.example
        });
        setSavedItemIds(prev => [...prev, questionId]);
      }
    } catch (error) {
      console.error("Error saving vocab:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLearned = (word: string) => {
    const updated = learnedWords.includes(word) 
      ? learnedWords.filter(w => w !== word) 
      : [...learnedWords, word];
    
    setLearnedWords(updated);
    localStorage.setItem('learned_vocab_list_v1', JSON.stringify(updated));
    // Proactively update saved list to prevent repeat in next set
    if (!updated.includes(word)) {
       // if unlearned, maybe refresh? but user might want to stay
    }
  };

  const gradients = [
    "from-pink-500/10 to-rose-500/5 hover:border-pink-500/50",
    "from-blue-500/10 to-cyan-500/5 hover:border-blue-500/50",
    "from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/50",
    "from-amber-500/10 to-orange-500/5 hover:border-amber-500/50",
    "from-purple-500/10 to-fuchsia-500/5 hover:border-purple-500/50"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-sm font-medium text-muted-foreground w-full">
        <span>Today's Words ({vocab.length})</span>
        <button onClick={onRefresh} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors font-bold">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vocab.map((word, index) => {
          const questionId = `vocab-${word.word.toLowerCase()}`;
          const isSaved = savedItemIds.includes(questionId);
          const isLearned = learnedWords.includes(word.word);
          const gradients = [
            "from-pink-500/10 to-rose-500/5 hover:border-pink-500/50",
            "from-blue-500/10 to-cyan-500/5 hover:border-blue-500/50",
            "from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/50",
            "from-amber-500/10 to-orange-500/5 hover:border-amber-500/50",
            "from-purple-500/10 to-fuchsia-500/5 hover:border-purple-500/50"
          ];
          const colorClass = gradients[index % gradients.length];

          return (
            <div key={index} className={`flex flex-col bg-white border-2 ${isLearned ? 'border-emerald-500/30 bg-emerald-50/10 opacity-70' : 'border-border/40'} rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden transition-all duration-500 relative group`}>
              
              {isLearned && (
                <div className="absolute top-4 right-4 z-20 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-sm animate-in zoom-in duration-300">
                  Learned ✓
                </div>
              )}

              <div className="h-56 w-full bg-[#f8fafc] relative overflow-hidden flex items-center justify-center p-8">
                {word.image ? (
                  <Image 
                    src={word.image} 
                    alt={word.word} 
                    fill
                    className="object-contain p-4 transition-transform duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="text-7xl drop-shadow-md transform transition-transform group-hover:scale-110 duration-500">
                      {word.emoji || "📚"}
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded">
                    Word of the Day
                  </span>
                </div>

                <h3 className="text-4xl font-black tracking-tight text-[#0f172a] mb-2 uppercase drop-shadow-sm group-hover:text-primary transition-colors">
                  {word.word}
                </h3>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  <Link2 className="w-3 h-3" />
                  Root: <span className="text-slate-600">{word.root}</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-sm font-bold text-[#10b981] mb-1">Meaning:</p>
                    <p className="text-lg font-medium text-slate-700 leading-snug">
                      {word.meaning}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 py-2">
                    {word.synonyms?.slice(0, 3).map((syn: string, i: number) => (
                      <span key={i} className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {syn}
                      </span>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#10b981]/20 rounded-full" />
                    <div className="pl-6 py-1">
                      <p className="text-slate-500 italic text-base leading-relaxed">
                        "{word.example}"
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-8 mt-6 border-t border-slate-100">
                  <button 
                    onClick={() => toggleSave(word)} 
                    disabled={isSaving} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border ${
                      isSaved 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} /> 
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <button 
                    onClick={() => toggleLearned(word.word)} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border ${
                      isLearned 
                        ? 'bg-emerald-500 text-white border-emerald-500' 
                        : 'bg-[#0f172a] hover:bg-slate-800 text-white border-[#0f172a]'
                    }`}
                  >
                    {isLearned ? 'Learned ✓' : 'Learned'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrammarSection({ grammar }: { grammar: any[] }) {
  const { user } = useAuth();
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [learnedRules, setLearnedRules] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getSavedQuestions(user.uid).then(questions => {
        setSavedItemIds(questions.filter(q => normalizeSubject(q.subject) === "English").map(q => q.questionId));
      });
    }
    // Load learned rules from localStorage
    const stored = localStorage.getItem('learned_grammar_list_v1');
    if (stored) try { setLearnedRules(JSON.parse(stored)); } catch(e) {}
  }, [user]);

  const toggleSave = async (g: any, index: number) => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    // Create deterministic ID based on rule name
    const questionId = `grammar-${g.rule.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
    const isSaved = savedItemIds.includes(questionId);
    
    try {
      if (isSaved) {
        await deleteSavedQuestion(user.uid, questionId);
        setSavedItemIds(prev => prev.filter(id => id !== questionId));
      } else {
        await saveQuestion(user.uid, {
          questionId,
          subject: normalizeSubject("English"),
          topic: "Grammar Rules",
          questionText: g.rule,
          options: [g.detail],
          correctAnswer: g.detail,
          explanation: g.detail,
        });
        setSavedItemIds(prev => [...prev, questionId]);
      }
    } catch (error) {
      console.error("Error saving grammar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLearned = (rule: string) => {
    const updated = learnedRules.includes(rule) 
      ? learnedRules.filter(r => r !== rule) 
      : [...learnedRules, rule];
    
    setLearnedRules(updated);
    localStorage.setItem('learned_grammar_list_v1', JSON.stringify(updated));
  };

  const borderColors = [
    "border-l-pink-500",
    "border-l-blue-500",
    "border-l-emerald-500",
    "border-l-amber-500",
    "border-l-purple-500"
  ];
  
  const bgColors = [
    "bg-pink-500/10 text-pink-600",
    "bg-blue-500/10 text-blue-600",
    "bg-emerald-500/10 text-emerald-600",
    "bg-amber-500/10 text-amber-600",
    "bg-purple-500/10 text-purple-600"
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {grammar.map((g, i) => {
        const questionId = `grammar-${g.rule.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
        const isSaved = savedItemIds.includes(questionId);
        const isLearned = learnedRules.includes(g.rule);
        const borderColor = borderColors[i % borderColors.length];
        const badgeColor = bgColors[i % bgColors.length];
        
        return (
          <div key={i} className={`flex flex-col bg-card border-l-[6px] ${isLearned ? 'border-emerald-500 bg-emerald-50/10' : borderColor} border-y-2 border-r-2 border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
            {isLearned && (
              <div className="absolute top-4 right-4 z-20 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-sm animate-in zoom-in duration-300">
                Learned ✓
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${isLearned ? 'bg-emerald-500/10 text-emerald-600' : badgeColor}`}>
                Rule {i+1}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground/90 group-hover:text-primary transition-colors">{g.rule}</h3>
            <p className="text-muted-foreground mb-5 flex-1 leading-relaxed">{g.detail}</p>
            <div className={`p-4 rounded-xl text-sm border border-border/50 mb-6 shadow-inner ${isLearned ? 'bg-emerald-500/5' : 'bg-muted/50'}`}>
              <span className="font-bold flex items-center gap-2 mb-2 text-foreground"><Volume2 className="w-4 h-4"/> Example:</span>
              <p className="whitespace-pre-line text-foreground/80 font-medium italic">"{g.example}"</p>
            </div>
            
            <div className="mt-auto flex items-center gap-3 pt-4 border-t border-border/50">
              <button onClick={() => toggleSave(g, i)} disabled={isSaving} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${isSaved ? 'bg-primary/10 text-primary border-primary/30' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} /> 
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button 
                onClick={() => toggleLearned(g.rule)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
                  isLearned 
                    ? 'bg-emerald-500 text-white border-emerald-500' 
                    : 'bg-[#0f172a] hover:bg-slate-800 text-white border-[#0f172a]'
                }`}
              >
                {isLearned ? 'Learned ✓' : 'Learned'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GamesSection({ vocab, grammar }: { vocab: any[], grammar: any[] }) {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
    const allQuestions: any[] = [];
    
    vocab.forEach(v => {
      const incorrect = vocab.filter(w => w.word !== v.word).map(w => w.meaning);
      const options = shuffle([v.meaning, ...shuffle(incorrect).slice(0, 3)]);
      allQuestions.push({
        type: 'vocab',
        prompt: `What is the meaning of the word "${v.word}"?`,
        correctAnswer: v.meaning,
        options: options
      });
    });

    grammar.forEach(g => {
      const incorrect = grammar.filter(r => r.rule !== g.rule).map(r => r.rule);
      const options = shuffle([g.rule, ...shuffle(incorrect).slice(0, 3)]);
      allQuestions.push({
        type: 'grammar',
        prompt: `Which grammar rule applies to this example: "${g.example}"?`,
        correctAnswer: g.rule,
        options: options
      });
    });

    setQuestions(shuffle(allQuestions).slice(0, 10)); // Play 10 random questions
    setScore(0);
    setCurrentIndex(0);
    setGameState("playing");
  };

  const handleAnswer = (selected: string) => {
    // Record user answer for review
    setQuestions(prev => {
      const updated = [...prev];
      updated[currentIndex].userAnswer = selected;
      return updated;
    });

    if (selected === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    }
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
    } else {
      setGameState("gameover");
    }
  };

  const saveQuestionToNotes = (index: number) => {
     setQuestions(prev => {
       const updated = [...prev];
       updated[index].saved = !updated[index].saved;
       return updated;
     });
  };

  if (gameState === "start") {
    return (
      <div className="max-w-4xl mx-auto text-center py-10 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-secondary/20 text-secondary mb-4 shadow-inner">
          <Trophy className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight">SarkariStaar Quiz Master</h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Test your knowledge! You'll be asked 10 random questions from today's Vocab and Grammar lessons. Can you score a perfect 10?
        </p>
        <button onClick={startGame} className="h-14 px-10 text-lg bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all hover:-translate-y-1">
          Start Challenge
        </button>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black text-foreground mb-6">Game Over!</h2>
          <div className="p-8 rounded-3xl bg-card border-2 border-border shadow-xl inline-block">
            <p className="text-xl font-bold mb-2">Final Score</p>
            <p className="text-6xl font-black text-primary">{score} <span className="text-3xl text-muted-foreground">/ 10</span></p>
          </div>
          <div className="pt-8">
            <button onClick={startGame} className="h-12 px-8 bg-secondary text-secondary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-secondary/90 transition-all hover:-translate-y-1">
              <RefreshCw className="w-5 h-5 inline mr-2" /> Play Again
            </button>
          </div>
        </div>
        
        <div className="border-t border-border pt-10">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary"/> Review Your Answers</h3>
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border-l-4 bg-card shadow-sm ${q.userAnswer === q.correctAnswer ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Question {idx + 1} - {q.type === 'vocab' ? 'Vocabulary' : 'Grammar'}</span>
                     <p className="text-lg font-bold text-foreground">{q.prompt}</p>
                   </div>
                   <button 
                     onClick={() => saveQuestionToNotes(idx)} 
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${q.saved ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
                   >
                     <Bookmark className={`w-4 h-4 ${q.saved ? 'fill-primary' : ''}`} />
                     {q.saved ? 'Saved' : 'Save'}
                   </button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div>
                     <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Your Answer</span>
                     <p className={`font-bold ${q.userAnswer === q.correctAnswer ? 'text-emerald-600' : 'text-destructive'}`}>
                       {q.userAnswer || "Skipped"} {q.userAnswer === q.correctAnswer ? '✓' : '✗'}
                     </p>
                   </div>
                   {q.userAnswer !== q.correctAnswer && (
                     <div>
                       <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Correct Answer</span>
                       <p className="font-bold text-emerald-600">{q.correctAnswer}</p>
                     </div>
                   )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Question {currentIndex + 1} of 10</span>
        <span className="text-sm font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">Score: {score}</span>
      </div>

      <div className="bg-card border-2 border-border p-8 md:p-10 rounded-3xl shadow-lg mb-8">
        <div className="inline-block px-3 py-1 bg-muted rounded-md text-xs font-bold uppercase tracking-widest mb-6">
          {q.type === 'vocab' ? 'Vocabulary' : 'Grammar'}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold leading-snug mb-2">{q.prompt}</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {q.options.map((opt: string, i: number) => (
          <button 
            key={i}
            onClick={() => handleAnswer(opt)}
            className="p-6 border-2 border-border rounded-2xl text-left font-medium hover:border-primary hover:bg-primary/5 transition-all w-full text-foreground/90 shadow-sm hover:shadow flex flex-col gap-2"
          >
            {(() => {
              const s = safeText(opt);
              const hasUrl = s.includes('http');
              if (!hasUrl) return s;

              const parts = s.split(/(https?:\/\/[^\s]+)/);
              return parts.map((part, index) => {
                if (part.startsWith('http')) {
                  return (
                    <div key={index} className="mt-1 rounded-lg overflow-hidden border border-border bg-white p-1 max-w-[150px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={toDirectImageUrl(part)} 
                        alt={`Option figure ${index}`} 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  );
                }
                return <span key={index}>{part}</span>;
              });
            })()}
          </button>
        ))}
      </div>
    </div>
  );
}
