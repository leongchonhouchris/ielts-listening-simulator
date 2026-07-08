// =============================================================
// IELTS LISTENING — SAMPLE TEST DATA
// Full 4-section academic listening test, 40 questions
// Mixed difficulty: S1–S2 Band 5–6.5, S3–S4 Band 6.5–7.5
//
// TAPESCRIPT, AUDIO GUIDE & ANSWER KEY are in AUDIO-GUIDE.md
// =============================================================

export const SAMPLE_TEST = {
  title: "IELTS Academic Listening – Practice Test 1",
  timeLimit: 30,
  audioMode: "teacher",   // "browser" | "teacher"
  audioUrl: "",           // set this when audioMode is "browser"
  sections: [

    // ── SECTION 1 ──────────────────────────────────────────────
    // Two speakers: a student (Emily) booking a sports centre
    // facility. Form completion + multiple choice.
    // Difficulty: Band 5–6
    {
      id: "s1",
      title: "Section 1",
      topic: "Booking a sports facility",
      label: "Questions 1–10",
      questions: [

        // Part A: Form completion (Q1–6)
        {
          id: 1,
          type: "form_completion",
          stem: "Name of facility:",
          answer: "Riverside",
          formLabel: "Sports Centre Name",
          placeholder: "Write ONE WORD"
        },
        {
          id: 2,
          type: "form_completion",
          stem: "Activity booked:",
          answer: "badminton",
          formLabel: "Activity",
          placeholder: "Write ONE WORD"
        },
        {
          id: 3,
          type: "form_completion",
          stem: "Day of booking:",
          answer: "Thursday",
          formLabel: "Day",
          placeholder: "Write ONE WORD"
        },
        {
          id: 4,
          type: "form_completion",
          stem: "Start time:",
          answer: "7:30",
          formLabel: "Start Time",
          placeholder: "Write the time"
        },
        {
          id: 5,
          type: "form_completion",
          stem: "Court number:",
          answer: "4",
          formLabel: "Court Number",
          placeholder: "Write a NUMBER"
        },
        {
          id: 6,
          type: "form_completion",
          stem: "Membership number:",
          answer: "KR2847",
          formLabel: "Membership Number",
          placeholder: "Write letters and numbers"
        },

        // Part B: Multiple choice (Q7–10)
        {
          id: 7,
          type: "multiple_choice",
          stem: "What is the cost of renting equipment per session?",
          options: [
            { letter: "A", text: "£2.50" },
            { letter: "B", text: "£3.00" },
            { letter: "C", text: "£4.50" }
          ],
          answer: "C"
        },
        {
          id: 8,
          type: "multiple_choice",
          stem: "Which refreshment option is currently available at the centre?",
          options: [
            { letter: "A", text: "A café serving hot meals" },
            { letter: "B", text: "Vending machines only" },
            { letter: "C", text: "A juice bar" }
          ],
          answer: "B"
        },
        {
          id: 9,
          type: "multiple_choice",
          stem: "What does the receptionist recommend Emily bring?",
          options: [
            { letter: "A", text: "Her own racket" },
            { letter: "B", text: "A towel and padlock" },
            { letter: "C", text: "Her student ID" }
          ],
          answer: "B"
        },
        {
          id: 10,
          type: "multiple_choice",
          stem: "How can Emily cancel or change her booking?",
          options: [
            { letter: "A", text: "By calling the centre directly" },
            { letter: "B", text: "By visiting in person" },
            { letter: "C", text: "Through the centre's website or app" }
          ],
          answer: "C"
        }
      ]
    },

    // ── SECTION 2 ──────────────────────────────────────────────
    // One speaker: an audio guide to Greenfield Nature Reserve.
    // Note completion + map labelling.
    // Difficulty: Band 5.5–6.5
    {
      id: "s2",
      title: "Section 2",
      topic: "Greenfield Nature Reserve audio guide",
      label: "Questions 11–20",
      questions: [

        // Part A: Note completion (Q11–16)
        {
          id: 11,
          type: "note_completion",
          stem: "Year the reserve was established:",
          answer: "1987",
          noteLabel: "Year established",
          placeholder: "Write a NUMBER"
        },
        {
          id: 12,
          type: "note_completion",
          stem: "Total area of the reserve:",
          answer: "340",
          noteLabel: "Area (hectares)",
          placeholder: "Write a NUMBER"
        },
        {
          id: 13,
          type: "note_completion",
          stem: "The reserve is particularly known for its population of:",
          answer: "otters",
          noteLabel: "Notable species",
          placeholder: "Write ONE WORD"
        },
        {
          id: 14,
          type: "note_completion",
          stem: "Visitors must stay on marked trails to protect:",
          answer: "nesting sites",
          noteLabel: "Reason for trail rule",
          placeholder: "Write TWO WORDS"
        },
        {
          id: 15,
          type: "note_completion",
          stem: "The café is open from 9 am until:",
          answer: "4 pm",
          noteLabel: "Café closing time",
          placeholder: "Write the time"
        },
        {
          id: 16,
          type: "note_completion",
          stem: "Guided walks are offered every:",
          answer: "Saturday",
          noteLabel: "Guided walk day",
          placeholder: "Write ONE WORD"
        },

        // Part B: Map/plan labelling (Q17–20)
        // Describes a simple reserve map with 6 labelled points (A–F)
        // Questions ask students to match descriptions to locations
        {
          id: 17,
          type: "map_labelling",
          stem: "The bird hide",
          options: [
            { letter: "A", text: "A" }, { letter: "B", text: "B" },
            { letter: "C", text: "C" }, { letter: "D", text: "D" },
            { letter: "E", text: "E" }, { letter: "F", text: "F" }
          ],
          answer: "C",
          mapImage: null,
          mapDescription: "Map of Greenfield Nature Reserve. Key: A = Main entrance, B = Car park, C = Bird hide (near the pond), D = Visitor centre, E = Picnic area, F = Riverside trail start"
        },
        {
          id: 18,
          type: "map_labelling",
          stem: "The picnic area",
          options: [
            { letter: "A", text: "A" }, { letter: "B", text: "B" },
            { letter: "C", text: "C" }, { letter: "D", text: "D" },
            { letter: "E", text: "E" }, { letter: "F", text: "F" }
          ],
          answer: "E",
          mapImage: null,
          mapDescription: "Map of Greenfield Nature Reserve."
        },
        {
          id: 19,
          type: "map_labelling",
          stem: "The visitor centre",
          options: [
            { letter: "A", text: "A" }, { letter: "B", text: "B" },
            { letter: "C", text: "C" }, { letter: "D", text: "D" },
            { letter: "E", text: "E" }, { letter: "F", text: "F" }
          ],
          answer: "D",
          mapImage: null,
          mapDescription: "Map of Greenfield Nature Reserve."
        },
        {
          id: 20,
          type: "map_labelling",
          stem: "The start of the riverside trail",
          options: [
            { letter: "A", text: "A" }, { letter: "B", text: "B" },
            { letter: "C", text: "C" }, { letter: "D", text: "D" },
            { letter: "E", text: "E" }, { letter: "F", text: "F" }
          ],
          answer: "F",
          mapImage: null,
          mapDescription: "Map of Greenfield Nature Reserve."
        }
      ]
    },

    // ── SECTION 3 ──────────────────────────────────────────────
    // Three speakers: two students (Priya and Marcus) + a tutor
    // (Dr Hartley) discussing a group research project on
    // sustainable packaging.
    // Difficulty: Band 6.5–7
    {
      id: "s3",
      title: "Section 3",
      topic: "University tutorial: sustainable packaging research",
      label: "Questions 21–30",
      questions: [

        // Part A: Multiple choice (Q21–24)
        {
          id: 21,
          type: "multiple_choice",
          stem: "What does Dr Hartley say is the main weakness of their literature review?",
          options: [
            { letter: "A", text: "It relies too heavily on industry-funded research." },
            { letter: "B", text: "It does not include enough recent sources." },
            { letter: "C", text: "It focuses only on plastic packaging." }
          ],
          answer: "A"
        },
        {
          id: 22,
          type: "multiple_choice",
          stem: "What do Priya and Marcus agree is the most significant barrier to adopting sustainable packaging?",
          options: [
            { letter: "A", text: "Consumer resistance to new materials" },
            { letter: "B", text: "The higher cost of biodegradable materials" },
            { letter: "C", text: "A lack of government regulation" }
          ],
          answer: "B"
        },
        {
          id: 23,
          type: "multiple_choice",
          stem: "What does Dr Hartley suggest they add to their methodology?",
          options: [
            { letter: "A", text: "A survey of packaging manufacturers" },
            { letter: "B", text: "A comparative life-cycle analysis" },
            { letter: "C", text: "A series of consumer focus groups" }
          ],
          answer: "B"
        },
        {
          id: 24,
          type: "multiple_choice",
          stem: "How does Marcus feel about the project timeline?",
          options: [
            { letter: "A", text: "He thinks they have enough time if they divide the work evenly." },
            { letter: "B", text: "He is worried they will not finish the data collection in time." },
            { letter: "C", text: "He believes the deadline should be extended." }
          ],
          answer: "B"
        },

        // Part B: Table completion (Q25–28)
        {
          id: 25,
          type: "table_completion",
          stem: "Material studied — Bamboo fibre: main advantage listed",
          answer: "rapid growth",
          tableLabel: "Bamboo fibre – Advantage",
          placeholder: "Write TWO WORDS"
        },
        {
          id: 26,
          type: "table_completion",
          stem: "Material studied — Seaweed film: main limitation listed",
          answer: "moisture sensitivity",
          tableLabel: "Seaweed film – Limitation",
          placeholder: "Write TWO WORDS"
        },
        {
          id: 27,
          type: "table_completion",
          stem: "Material studied — Mycelium composite: current status",
          answer: "pilot stage",
          tableLabel: "Mycelium composite – Status",
          placeholder: "Write TWO WORDS"
        },
        {
          id: 28,
          type: "table_completion",
          stem: "Material studied — Recycled paper pulp: cost compared to plastic",
          answer: "30%",
          tableLabel: "Recycled paper pulp – Cost premium",
          placeholder: "Write a NUMBER and symbol"
        },

        // Part C: Matching (Q29–30)
        // Match each task to the person responsible
        {
          id: 29,
          type: "matching",
          stem: "Completing the supplier interview schedule",
          options: [
            { letter: "A", text: "Priya" },
            { letter: "B", text: "Marcus" },
            { letter: "C", text: "Dr Hartley" }
          ],
          answer: "A"
        },
        {
          id: 30,
          type: "matching",
          stem: "Revising the literature review",
          options: [
            { letter: "A", text: "Priya" },
            { letter: "B", text: "Marcus" },
            { letter: "C", text: "Dr Hartley" }
          ],
          answer: "B"
        }
      ]
    },

    // ── SECTION 4 ──────────────────────────────────────────────
    // One speaker: an academic lecture on the psychology of
    // decision-making (specifically the dual-process theory).
    // Difficulty: Band 7–7.5
    {
      id: "s4",
      title: "Section 4",
      topic: "Academic lecture: the psychology of decision-making",
      label: "Questions 31–40",
      questions: [

        // Part A: Sentence completion (Q31–35)
        {
          id: 31,
          type: "sentence_completion",
          stem: "Kahneman's dual-process theory proposes that human thinking operates through two distinct ___________.",
          answer: "systems",
          placeholder: "Write ONE WORD"
        },
        {
          id: 32,
          type: "sentence_completion",
          stem: "System 1 is described as fast, automatic, and largely ___________.",
          answer: "unconscious",
          placeholder: "Write ONE WORD"
        },
        {
          id: 33,
          type: "sentence_completion",
          stem: "The anchoring effect demonstrates that people are disproportionately influenced by the first piece of ___________ they encounter.",
          answer: "information",
          placeholder: "Write ONE WORD"
        },
        {
          id: 34,
          type: "sentence_completion",
          stem: "Research by Ariely showed that arbitrary numbers can significantly alter consumers' ___________ of value.",
          answer: "perception",
          placeholder: "Write ONE WORD"
        },
        {
          id: 35,
          type: "sentence_completion",
          stem: "The lecturer argues that awareness of cognitive biases does not reliably ___________ their influence.",
          answer: "eliminate",
          placeholder: "Write ONE WORD"
        },

        // Part B: Multiple choice (Q36–38)
        {
          id: 36,
          type: "multiple_choice",
          stem: "According to the lecturer, what is the primary reason System 2 thinking is used less than System 1?",
          options: [
            { letter: "A", text: "It produces less accurate results in complex situations." },
            { letter: "B", text: "It requires significantly more cognitive effort and energy." },
            { letter: "C", text: "It is slower to respond to emotional stimuli." }
          ],
          answer: "B"
        },
        {
          id: 37,
          type: "multiple_choice",
          stem: "What does the lecturer say about nudge theory in policy-making?",
          options: [
            { letter: "A", text: "It has been widely discredited by behavioural economists." },
            { letter: "B", text: "It is effective but raises questions about individual autonomy." },
            { letter: "C", text: "It works best when people are aware they are being nudged." }
          ],
          answer: "B"
        },
        {
          id: 38,
          type: "multiple_choice",
          stem: "The lecturer concludes that future research should focus on:",
          options: [
            { letter: "A", text: "identifying which professions are most affected by cognitive bias" },
            { letter: "B", text: "developing training programmes to strengthen System 2 thinking" },
            { letter: "C", text: "understanding the neurological basis of dual-process systems" }
          ],
          answer: "B"
        },

        // Part C: Short answer (Q39–40)
        {
          id: 39,
          type: "short_answer",
          stem: "What term does the lecturer use for the tendency to favour information that confirms existing beliefs?",
          answer: "confirmation bias",
          placeholder: "Write NO MORE THAN TWO WORDS"
        },
        {
          id: 40,
          type: "short_answer",
          stem: "According to the lecture, in which field was nudge theory first widely applied?",
          answer: "public health",
          placeholder: "Write NO MORE THAN TWO WORDS"
        }
      ]
    }
  ]
};
