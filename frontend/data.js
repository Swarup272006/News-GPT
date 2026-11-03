/* =========================================================
   NewsGPT — SAMPLE DATA (explicitly fictional)
   ---------------------------------------------------------
   Every headline, publisher, timestamp and summary in this
   file is invented placeholder content. None of it comes from
   a real publisher. Replace with real API responses later.
   Photos are free-licence Unsplash images used as visual
   stand-ins only; they do not depict the fictional events.
   ========================================================= */

window.NEWSGPT_CONFIG = {
  apiBase: "http://127.0.0.1:8000",
  googleClientId: null,
};

window.NEWSGPT_DATA = (function () {
  const img = (id) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=70`;

  const CATEGORIES = [
    "Business", "Technology", "Politics", "Sports",
    "Science", "Entertainment", "Health", "World News",
  ];

  const MARQUEE = [
    "Beyond Headlines. Discover the Complete Story.",
    "AI-Powered Topic Discovery Across News Sources.",
    "Follow Every Story Through Time.",
    "Explore Multiple Publishers. Keep the Original Sources.",
    "From Breaking News to Chronological Timelines.",
  ];

  // Timeline helper: [day, "HH:MM", publisher, headline, summary, reportedEvent?]
  const T = (rows) =>
    rows.map(([d, hm, publisher, headline, summary, eventNote]) => ({
      publishedAt: `2026-10-${d}T${hm}:00+05:30`,
      publisher, headline, summary,
      eventNote: eventNote || null,
      url: null, // sample item: no real original article
    }));

  const stories = [
    {
      id: "archive-sorting-model",
      category: "Technology",
      featured: true,
      headline: "A New Language Model Reshapes How Newsrooms Sort Their Archives",
      dek: "Sample story: editors test automated topic grouping across decades of stored reports, and weigh accuracy against transparency.",
      image: { src: img("1584169417032-d34e8d805e8b"), credit: "İsmail Enes Ayhan / Unsplash", alt: "A server room aisle lined with equipment racks" },
      timeline: T([
        [13, "09:00", "Sample Daily Ledger", "Newsroom begins pilot of automatic topic grouping", "A fictional regional newsroom starts grouping archive stories by topic using a text model."],
        [13, "11:45", "Demo Courier", "Editors question how grouped stories are labelled", "Sample coverage of editors asking how the system names and justifies its clusters.", "Editors' meeting held earlier that morning"],
        [14, "08:30", "Placeholder Post", "Pilot results show mixed accuracy on older reports", "Fictional early results: strong on recent stories, weaker on archives with inconsistent formatting."],
        [14, "16:10", "Example Herald", "Newsroom promises source links beside every grouped story", "Sample follow-up: the pilot will always show original article links next to any summary."],
      ]),
    },
    {
      id: "rate-decision-markets",
      category: "Business",
      featured: true,
      headline: "Markets Weigh a Fictional Rate Decision as Traders Reposition",
      dek: "Sample story: a made-up central-bank announcement prompts a day of cautious trading across sectors.",
      image: { src: img("1611974789855-9c2a0a7236a3"), credit: "Maxim Hopman / Unsplash", alt: "Candlestick chart on a dark trading screen" },
      timeline: T([
        [14, "09:15", "Mock Meridian", "Opening trade muted ahead of rate announcement", "Fictional report of subdued early trading before an expected policy statement."],
        [14, "12:40", "Sample Daily Ledger", "Policy statement lands; indices move in narrow range", "Sample coverage of the statement and a modest market reaction.", "Statement released at midday"],
        [14, "15:20", "Specimen Standard", "Analysts split on what the decision signals", "Made-up analysts disagree about whether the decision marks a pause or a shift."],
        [15, "08:05", "Demo Courier", "Overnight view: traders hold positions, await data", "Fictional morning wrap noting traders waiting for the next set of figures."],
        [15, "10:30", "Example Herald", "Small businesses ask what the decision means for loans", "Sample explainer on how a rate decision could reach everyday borrowers."],
      ]),
    },
    {
      id: "transparency-bill-debate",
      category: "Politics",
      featured: true,
      headline: "Sample Parliament Debates a Public Data Transparency Bill",
      dek: "Sample story: a fictional bill on publishing government datasets draws support and sharp amendments.",
      image: { src: img("1592639296346-560c37a0f711"), credit: "Laurentiu Morariu / Unsplash", alt: "A wide boulevard leading toward a grand government building" },
      timeline: T([
        [12, "10:00", "Placeholder Post", "Transparency bill introduced in the lower house", "Fictional introduction of a bill requiring regular release of public datasets."],
        [13, "14:20", "Mock Meridian", "Opposition proposes amendments on data privacy", "Sample coverage of proposed privacy safeguards for released datasets."],
        [14, "11:10", "Sample Daily Ledger", "Committee hears from civic groups and archivists", "Made-up committee session with invited groups supporting open data."],
        [15, "09:40", "Specimen Standard", "Vote scheduled after two days of debate", "Fictional scheduling note: a final vote is expected later in the week.", "Vote date announced by the speaker"],
      ]),
    },
    {
      id: "last-over-final",
      category: "Sports",
      featured: true,
      headline: "Fictional Cricket Final Goes Down to the Last Over",
      dek: "Sample story: an invented championship final under lights ends with a tense finish.",
      image: { src: img("1675693303492-9a5bc898bf94"), credit: "Aditya Chandegara / Unsplash", alt: "A cricket stadium and green pitch under a deep red evening sky" },
      timeline: T([
        [14, "18:30", "Example Herald", "Final begins under lights with a full house", "Fictional match report opening: toss, teams and a packed stadium."],
        [14, "20:15", "Demo Courier", "Middle overs swing the contest", "Sample mid-innings coverage describing a shift in momentum."],
        [14, "22:40", "Sample Daily Ledger", "Last-over finish decides the title", "Made-up report of a tight ending decided in the final over.", "Final over bowled around 22:35"],
        [15, "07:50", "Specimen Standard", "Morning-after reactions and a look at key moments", "Fictional round-up of reactions and turning points."],
      ]),
    },
    {
      id: "heritage-summit",
      category: "World News",
      featured: true,
      headline: "Imagined Heritage Summit Opens in a Historic City",
      dek: "Sample story: delegates from a made-up alliance meet to discuss protecting old monuments from climate stress.",
      image: { src: img("1632426237957-5ea14aae7100"), credit: "Marvin Castelino / Unsplash", alt: "A tall stone minaret rising above green trees" },
      timeline: T([
        [13, "08:00", "Mock Meridian", "Heritage summit opens with a call for shared funding", "Fictional opening-day coverage of a conservation funding proposal."],
        [14, "10:20", "Placeholder Post", "Working groups draft monument-protection guidelines", "Sample coverage of drafting sessions on maintenance standards."],
        [15, "09:00", "Sample Daily Ledger", "Delegates agree on a short joint statement", "Made-up report of a brief statement and plans for a follow-up meeting."],
      ]),
    },
    {
      id: "faint-signal-survey",
      category: "Science",
      featured: true,
      headline: "Hypothetical Telescope Survey Reports Faint New Signals",
      dek: "Sample story: a fictional sky survey flags faint sources and asks other teams to check the data.",
      image: { src: img("1451187580459-43490279c0fa"), credit: "NASA / Unsplash", alt: "A star-filled view of outer space" },
      timeline: T([
        [11, "13:00", "Specimen Standard", "Survey team posts early catalogue of faint sources", "Fictional report of a new catalogue released for outside review."],
        [12, "16:30", "Example Herald", "Independent groups begin cross-checking the data", "Sample coverage of researchers beginning independent checks."],
        [14, "12:00", "Demo Courier", "Team cautions findings are preliminary", "Made-up statement stressing that results need confirmation."],
      ]),
    },
    {
      id: "clinic-access-pilot",
      category: "Health",
      featured: false,
      headline: "Sample Neighbourhood Clinics Trial Longer Evening Hours",
      dek: "Sample story: a fictional pilot extends opening hours to reduce crowding at morning appointments.",
      image: null,
      timeline: T([
        [13, "09:30", "Placeholder Post", "Pilot announces evening hours at three clinics", "Fictional announcement of extended hours for a trial period."],
        [14, "15:00", "Demo Courier", "Patients report shorter morning queues", "Sample coverage of early feedback from visitors."],
      ]),
    },
    {
      id: "film-festival-lineup",
      category: "Entertainment",
      featured: false,
      headline: "Imaginary Film Festival Unveils Its Opening-Week Lineup",
      dek: "Sample story: a made-up festival lists its first screenings and a retrospective programme.",
      image: null,
      timeline: T([
        [12, "12:00", "Mock Meridian", "Festival reveals first set of screenings", "Fictional lineup announcement covering opening-week titles."],
        [14, "17:45", "Example Herald", "Retrospective strand added to the programme", "Sample coverage of an added retrospective section."],
      ]),
    },
  ];

  const TRENDING = ["archive-sorting-model", "rate-decision-markets", "transparency-bill-debate", "last-over-final"];

  return { CATEGORIES, MARQUEE, stories, TRENDING };
})();
