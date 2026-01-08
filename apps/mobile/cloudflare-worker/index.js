
const quoteAuthors = [
    // Motivation & Hard Work (1-50)
    { textKey: "quotes.q1", author: "Pelé" },
    { textKey: "quotes.q2", author: "John D. Rockefeller" },
    { textKey: "quotes.q3", author: "Eleanor Roosevelt" },
    { textKey: "quotes.q4", author: "Henry Ford" },
    { textKey: "quotes.q5", author: "Winston Churchill" },
    { textKey: "quotes.q6", author: "Thomas Edison" },
    { textKey: "quotes.q7", author: "Eleanor Roosevelt" },
    { textKey: "quotes.q8", author: "Steve Jobs" },
    { textKey: "quotes.q9", author: "Bill Gates" },
    { textKey: "quotes.q10", author: "Albert Einstein" },
    { textKey: "quotes.q11", author: "Albert Einstein" },
    { textKey: "quotes.q12", author: "Nelson Mandela" },
    { textKey: "quotes.q13", author: "Muhammad Ali" },
    { textKey: "quotes.q14", author: "Winston Churchill" },
    { textKey: "quotes.q15", author: "Audrey Hepburn" },
    { textKey: "quotes.q16", author: "Mary Pickford" },
    { textKey: "quotes.q17", author: "Oprah Winfrey" },
    { textKey: "quotes.q18", author: "Theodore Roosevelt" },
    { textKey: "quotes.q19", author: "Bobby Unser" },
    { textKey: "quotes.q20", author: "G. Michael Hopf" },
    { textKey: "quotes.q21", author: "Eleanor Roosevelt" },
    { textKey: "quotes.q22", author: "Aristoteles" },
    { textKey: "quotes.q23", author: "Benjamin Franklin" },
    { textKey: "quotes.q24", author: "Brian Tracy" },
    { textKey: "quotes.q25", author: "Robin Sharma" },
    { textKey: "quotes.q26", author: "Henry Ford" },
    { textKey: "quotes.q27", author: "Byron Pulsifer" },
    { textKey: "quotes.q28", author: "Vivian Greene" },
    { textKey: "quotes.q29", author: "Wayne Gretzky" },
    { textKey: "quotes.q30", author: "Jim Rohn" },
    { textKey: "quotes.q31", author: "Zig Ziglar" },
    { textKey: "quotes.q32", author: "Chris Gardner" },
    { textKey: "quotes.q33", author: "Jordan Peterson" },
    { textKey: "quotes.q34", author: "Jocko Willink" },
    { textKey: "quotes.q35", author: "Tony Robbins" },
    { textKey: "quotes.q36", author: "Richard Branson" },
    { textKey: "quotes.q37", author: "Les Brown" },
    { textKey: "quotes.q38", author: "Paulo Coelho" },
    { textKey: "quotes.q39", author: "Jack Ma" },
    { textKey: "quotes.q40", author: "Thomas Fuller" },
    { textKey: "quotes.q41", author: "Robin Sharma" },
    { textKey: "quotes.q42", author: "Jeff Bezos" },
    { textKey: "quotes.q43", author: "Muhammad Ali" },
    { textKey: "quotes.q44", author: "Oprah Winfrey" },
    { textKey: "quotes.q45", author: "Michael Jordan" },
    { textKey: "quotes.q46", author: "Nathaniel Branden" },
    { textKey: "quotes.q47", author: "Satya Nadella" },
    { textKey: "quotes.q48", author: "Walt Disney" },
    { textKey: "quotes.q49", author: "Sam Walton" },
    { textKey: "quotes.q50", author: "Napoleon Hill" },

    // Perseverance & Consistency (51-100)
    { textKey: "quotes.q51", author: "Robert Half" },
    { textKey: "quotes.q52", author: "Dwayne Johnson" },
    { textKey: "quotes.q53", author: "Malcolm Gladwell" },
    { textKey: "quotes.q54", author: "Mahatma Gandhi" },
    { textKey: "quotes.q55", author: "Leonardo da Vinci" },
    { textKey: "quotes.q56", author: "Confucius" },
    { textKey: "quotes.q57", author: "Lao Tzu" },
    { textKey: "quotes.q58", author: "John D. Rockefeller" },
    { textKey: "quotes.q59", author: "Jean-Jacques Rousseau" },
    { textKey: "quotes.q60", author: "Napoleon Bonaparte" },
    { textKey: "quotes.q61", author: "Robert Collier" },
    { textKey: "quotes.q62", author: "Bruce Lee" },
    { textKey: "quotes.q63", author: "Nikola Tesla" },
    { textKey: "quotes.q64", author: "Jean Paul Sartre" },
    { textKey: "quotes.q65", author: "Vince Lombardi" },
    { textKey: "quotes.q66", author: "Mark Twain" },
    { textKey: "quotes.q67", author: "Benjamin Franklin" },
    { textKey: "quotes.q68", author: "Albert Einstein" },
    { textKey: "quotes.q69", author: "Jack Welch" },
    { textKey: "quotes.q70", author: "Theodore Roosevelt" },
    { textKey: "quotes.q71", author: "Brian Tracy" },
    { textKey: "quotes.q72", author: "Tim Ferriss" },
    { textKey: "quotes.q73", author: "Henry Ford" },
    { textKey: "quotes.q74", author: "Zig Ziglar" },
    { textKey: "quotes.q75", author: "Ezop" },
    { textKey: "quotes.q76", author: "Tim Grover" },
    { textKey: "quotes.q77", author: "Thomas Edison" },
    { textKey: "quotes.q78", author: "Martin Luther King Jr." },
    { textKey: "quotes.q79", author: "Colin Powell" },
    { textKey: "quotes.q80", author: "Og Mandino" },
    { textKey: "quotes.q81", author: "Jeff Bezos" },
    { textKey: "quotes.q82", author: "Dolly Parton" },
    { textKey: "quotes.q83", author: "Napoleon Hill" },
    { textKey: "quotes.q84", author: "David Goggins" },
    { textKey: "quotes.q85", author: "Cato" },
    { textKey: "quotes.q86", author: "Vincent Van Gogh" },
    { textKey: "quotes.q87", author: "Pablo Picasso" },
    { textKey: "quotes.q88", author: "Tony Dungy" },
    { textKey: "quotes.q89", author: "US Army Corps of Engineers" },
    { textKey: "quotes.q90", author: "Napoleon Hill" },
    { textKey: "quotes.q91", author: "Marilyn vos Savant" },
    { textKey: "quotes.q92", author: "Warren Buffett" },
    { textKey: "quotes.q93", author: "Rocky Balboa (Film)" },
    { textKey: "quotes.q94", author: "Ovid" },
    { textKey: "quotes.q95", author: "Ray Dalio" },
    { textKey: "quotes.q96", author: "Dalai Lama" },
    { textKey: "quotes.q97", author: "David Goggins" },
    { textKey: "quotes.q98", author: "Japon Atasözü" },
    { textKey: "quotes.q99", author: "Lao Tzu" },
    { textKey: "quotes.q100", author: "Marcus Aurelius" },

    // Discipline & Self-Control (101-150)
    { textKey: "quotes.q101", author: "Jim Rohn" },
    { textKey: "quotes.q102", author: "Jocko Willink" },
    { textKey: "quotes.q103", author: "Aristoteles" },
    { textKey: "quotes.q104", author: "Sun Tzu" },
    { textKey: "quotes.q105", author: "Benjamin Franklin" },
    { textKey: "quotes.q106", author: "Antoine de Saint-Exupéry" },
    { textKey: "quotes.q107", author: "Jack Canfield" },
    { textKey: "quotes.q108", author: "Robert Maurer" },
    { textKey: "quotes.q109", author: "Jim Rohn" },
    { textKey: "quotes.q110", author: "Walt Disney" },
    { textKey: "quotes.q111", author: "Plato" },
    { textKey: "quotes.q112", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q113", author: "Kelly McGonigal" },
    { textKey: "quotes.q114", author: "Tony Robbins" },
    { textKey: "quotes.q115", author: "Eric Thomas" },
    { textKey: "quotes.q116", author: "Jocko Willink" },
    { textKey: "quotes.q117", author: "John C. Maxwell" },
    { textKey: "quotes.q118", author: "David Goggins" },
    { textKey: "quotes.q119", author: "Brian Tracy" },
    { textKey: "quotes.q120", author: "Les Brown" },
    { textKey: "quotes.q121", author: "Kobe Bryant" },
    { textKey: "quotes.q122", author: "Mike Tyson" },
    { textKey: "quotes.q123", author: "Mahatma Gandhi" },
    { textKey: "quotes.q124", author: "John Dryden" },
    { textKey: "quotes.q125", author: "Brian Tracy" },
    { textKey: "quotes.q126", author: "Abraham Lincoln" },
    { textKey: "quotes.q127", author: "George Leonard" },
    { textKey: "quotes.q128", author: "William Penn" },
    { textKey: "quotes.q129", author: "Jeff Bezos" },
    { textKey: "quotes.q130", author: "John Wooden" },
    { textKey: "quotes.q131", author: "Jocko Willink" },
    { textKey: "quotes.q132", author: "Ryan Holiday" },
    { textKey: "quotes.q133", author: "Tony Robbins" },
    { textKey: "quotes.q134", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q135", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q136", author: "Carol Dweck" },
    { textKey: "quotes.q137", author: "Robin Sharma" },
    { textKey: "quotes.q138", author: "James Clear" },
    { textKey: "quotes.q139", author: "Jocko Willink" },
    { textKey: "quotes.q140", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q141", author: "Dwayne Johnson" },
    { textKey: "quotes.q142", author: "Jerzy Gregorek" },
    { textKey: "quotes.q143", author: "Dalai Lama" },
    { textKey: "quotes.q144", author: "Warren Buffett" },
    { textKey: "quotes.q145", author: "Confucius" },
    { textKey: "quotes.q146", author: "Ray Dalio" },
    { textKey: "quotes.q147", author: "Jordan Peterson" },
    { textKey: "quotes.q148", author: "Jocko Willink" },
    { textKey: "quotes.q149", author: "Stephen Covey" },
    { textKey: "quotes.q150", author: "Warren Buffett" },

    // Success & Achievement (151-200)
    { textKey: "quotes.q151", author: "Angela Duckworth" },
    { textKey: "quotes.q152", author: "Mark Zuckerberg" },
    { textKey: "quotes.q153", author: "Elon Musk" },
    { textKey: "quotes.q154", author: "Richard Branson" },
    { textKey: "quotes.q155", author: "Jim Rohn" },
    { textKey: "quotes.q156", author: "Bill Gates" },
    { textKey: "quotes.q157", author: "Elon Musk" },
    { textKey: "quotes.q158", author: "Michael Jordan" },
    { textKey: "quotes.q159", author: "Les Brown" },
    { textKey: "quotes.q160", author: "Denzel Washington" },
    { textKey: "quotes.q161", author: "Colin Powell" },
    { textKey: "quotes.q162", author: "Zig Ziglar" },
    { textKey: "quotes.q163", author: "Theodore Roosevelt" },
    { textKey: "quotes.q164", author: "Michael Phelps" },
    { textKey: "quotes.q165", author: "Napoleon Hill" },
    { textKey: "quotes.q166", author: "Oscar Wilde" },
    { textKey: "quotes.q167", author: "Steve Jobs" },
    { textKey: "quotes.q168", author: "Walt Disney" },
    { textKey: "quotes.q169", author: "Tim Cook" },
    { textKey: "quotes.q170", author: "Bill Gates" },
    { textKey: "quotes.q171", author: "Vince Lombardi" },
    { textKey: "quotes.q172", author: "Elon Musk" },
    { textKey: "quotes.q173", author: "Oprah Winfrey" },
    { textKey: "quotes.q174", author: "Richard Branson" },
    { textKey: "quotes.q175", author: "Oprah Winfrey" },
    { textKey: "quotes.q176", author: "Tony Robbins" },
    { textKey: "quotes.q177", author: "Zig Ziglar" },
    { textKey: "quotes.q178", author: "Peter Drucker" },
    { textKey: "quotes.q179", author: "Martin Luther King Jr." },
    { textKey: "quotes.q180", author: "Jeff Bezos" },
    { textKey: "quotes.q181", author: "Serena Williams" },
    { textKey: "quotes.q182", author: "Cristiano Ronaldo" },
    { textKey: "quotes.q183", author: "Satya Nadella" },
    { textKey: "quotes.q184", author: "Ray Dalio" },
    { textKey: "quotes.q185", author: "Jack Ma" },
    { textKey: "quotes.q186", author: "Muhammad Ali" },
    { textKey: "quotes.q187", author: "Grant Cardone" },
    { textKey: "quotes.q188", author: "Warren Buffett" },
    { textKey: "quotes.q189", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q190", author: "Pablo Picasso" },
    { textKey: "quotes.q191", author: "Deepak Chopra" },
    { textKey: "quotes.q192", author: "Kobe Bryant" },
    { textKey: "quotes.q193", author: "Walt Disney" },
    { textKey: "quotes.q194", author: "Bill Gates" },
    { textKey: "quotes.q195", author: "Dwayne Johnson" },
    { textKey: "quotes.q196", author: "Steve Jobs" },
    { textKey: "quotes.q197", author: "Sam Walton" },
    { textKey: "quotes.q198", author: "Brian Tracy" },
    { textKey: "quotes.q199", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q200", author: "Tim Ferriss" },

    // Mindset & Attitude (201-250)
    { textKey: "quotes.q201", author: "Marisa Peer" },
    { textKey: "quotes.q202", author: "Wayne Dyer" },
    { textKey: "quotes.q203", author: "Marcus Aurelius" },
    { textKey: "quotes.q204", author: "Norman Vincent Peale" },
    { textKey: "quotes.q205", author: "Tony Robbins" },
    { textKey: "quotes.q206", author: "Buddha" },
    { textKey: "quotes.q207", author: "Mahatma Gandhi" },
    { textKey: "quotes.q208", author: "Charles Swindoll" },
    { textKey: "quotes.q209", author: "Earl Nightingale" },
    { textKey: "quotes.q210", author: "Jim Rohn" },
    { textKey: "quotes.q211", author: "Michael Jordan" },
    { textKey: "quotes.q212", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q213", author: "Lou Holtz" },
    { textKey: "quotes.q214", author: "Rhonda Byrne" },
    { textKey: "quotes.q215", author: "Dalai Lama" },
    { textKey: "quotes.q216", author: "Zig Ziglar" },
    { textKey: "quotes.q217", author: "Theodore Roosevelt" },
    { textKey: "quotes.q218", author: "Sun Tzu" },
    { textKey: "quotes.q219", author: "David Goggins" },
    { textKey: "quotes.q220", author: "Mahatma Gandhi" },
    { textKey: "quotes.q221", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q222", author: "John F. Kennedy" },
    { textKey: "quotes.q223", author: "Henry Ford" },
    { textKey: "quotes.q224", author: "Tim Ferriss" },
    { textKey: "quotes.q225", author: "Oprah Winfrey" },
    { textKey: "quotes.q226", author: "David Goggins" },
    { textKey: "quotes.q227", author: "Lao Tzu" },
    { textKey: "quotes.q228", author: "Jordan Peterson" },
    { textKey: "quotes.q229", author: "John Wooden" },
    { textKey: "quotes.q230", author: "Hal Elrod" },
    { textKey: "quotes.q231", author: "Tony Robbins" },
    { textKey: "quotes.q232", author: "Wayne Dyer" },
    { textKey: "quotes.q233", author: "Earl Nightingale" },
    { textKey: "quotes.q234", author: "Bruce Lee" },
    { textKey: "quotes.q235", author: "Louise Hay" },
    { textKey: "quotes.q236", author: "Zig Ziglar" },
    { textKey: "quotes.q237", author: "Eleanor Roosevelt" },
    { textKey: "quotes.q238", author: "Michael Phelps" },
    { textKey: "quotes.q239", author: "Deepak Chopra" },
    { textKey: "quotes.q240", author: "Napoleon Hill" },
    { textKey: "quotes.q241", author: "Ryan Holiday" },
    { textKey: "quotes.q242", author: "Oprah Winfrey" },
    { textKey: "quotes.q243", author: "Carol Dweck" },
    { textKey: "quotes.q244", author: "Tony Robbins" },
    { textKey: "quotes.q245", author: "Angela Duckworth" },
    { textKey: "quotes.q246", author: "James Allen" },
    { textKey: "quotes.q247", author: "Norman Vincent Peale" },
    { textKey: "quotes.q248", author: "Buddha" },
    { textKey: "quotes.q249", author: "Ray Dalio" },
    { textKey: "quotes.q250", author: "Carol Dweck" },

    // Work Ethic & Productivity (251-300)
    { textKey: "quotes.q251", author: "Kobe Bryant" },
    { textKey: "quotes.q252", author: "Tim Ferriss" },
    { textKey: "quotes.q253", author: "Peter Drucker" },
    { textKey: "quotes.q254", author: "Stephen Covey" },
    { textKey: "quotes.q255", author: "Steve Jobs" },
    { textKey: "quotes.q256", author: "Richard Branson" },
    { textKey: "quotes.q257", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q258", author: "Bill Gates" },
    { textKey: "quotes.q259", author: "Zig Ziglar" },
    { textKey: "quotes.q260", author: "Benjamin Franklin" },
    { textKey: "quotes.q261", author: "Tim Ferriss" },
    { textKey: "quotes.q262", author: "Jeff Bezos" },
    { textKey: "quotes.q263", author: "Mark Twain" },
    { textKey: "quotes.q264", author: "Ray Kroc" },
    { textKey: "quotes.q265", author: "Benjamin Franklin" },
    { textKey: "quotes.q266", author: "John C. Maxwell" },
    { textKey: "quotes.q267", author: "Simon Sinek" },
    { textKey: "quotes.q268", author: "Cal Newport" },
    { textKey: "quotes.q269", author: "David Goggins" },
    { textKey: "quotes.q270", author: "Tony Robbins" },
    { textKey: "quotes.q271", author: "Warren Buffett" },
    { textKey: "quotes.q272", author: "Brian Tracy" },
    { textKey: "quotes.q273", author: "Tim Ferriss" },
    { textKey: "quotes.q274", author: "Robin Sharma" },
    { textKey: "quotes.q275", author: "Greg McKeown" },
    { textKey: "quotes.q276", author: "Zig Ziglar" },
    { textKey: "quotes.q277", author: "William A. Ward" },
    { textKey: "quotes.q278", author: "Benjamin Franklin" },
    { textKey: "quotes.q279", author: "John Wooden" },
    { textKey: "quotes.q280", author: "Hal Elrod" },
    { textKey: "quotes.q281", author: "Cal Newport" },
    { textKey: "quotes.q282", author: "Cal Newport" },
    { textKey: "quotes.q283", author: "Brian Tracy" },
    { textKey: "quotes.q284", author: "Peter Drucker" },
    { textKey: "quotes.q285", author: "Kobe Bryant" },
    { textKey: "quotes.q286", author: "Brian Tracy" },
    { textKey: "quotes.q287", author: "Zig Ziglar" },
    { textKey: "quotes.q288", author: "John Wooden" },
    { textKey: "quotes.q289", author: "Gary Player" },
    { textKey: "quotes.q290", author: "Dwayne Johnson" },
    { textKey: "quotes.q291", author: "Cal Newport" },
    { textKey: "quotes.q292", author: "David Goggins" },
    { textKey: "quotes.q293", author: "Tony Robbins" },
    { textKey: "quotes.q294", author: "Peter Drucker" },
    { textKey: "quotes.q295", author: "Bill Gates" },
    { textKey: "quotes.q296", author: "Brian Tracy" },
    { textKey: "quotes.q297", author: "Stephen Covey" },
    { textKey: "quotes.q298", author: "Jim Rohn" },
    { textKey: "quotes.q299", author: "Tim Ferriss" },
    { textKey: "quotes.q300", author: "Benjamin Franklin" },

    // Courage & Determination (301-350)
    { textKey: "quotes.q301", author: "Nelson Mandela" },
    { textKey: "quotes.q302", author: "Dalai Lama" },
    { textKey: "quotes.q303", author: "Oprah Winfrey" },
    { textKey: "quotes.q304", author: "Mark Zuckerberg" },
    { textKey: "quotes.q305", author: "John Wayne" },
    { textKey: "quotes.q306", author: "Elon Musk" },
    { textKey: "quotes.q307", author: "Susan Jeffers" },
    { textKey: "quotes.q308", author: "Winston Churchill" },
    { textKey: "quotes.q309", author: "Tony Robbins" },
    { textKey: "quotes.q310", author: "Seth Godin" },
    { textKey: "quotes.q311", author: "Maya Angelou" },
    { textKey: "quotes.q312", author: "Eleanor Roosevelt" },
    { textKey: "quotes.q313", author: "Richard Branson" },
    { textKey: "quotes.q314", author: "David Goggins" },
    { textKey: "quotes.q315", author: "Aristotle" },
    { textKey: "quotes.q316", author: "Jeff Bezos" },
    { textKey: "quotes.q317", author: "Les Brown" },
    { textKey: "quotes.q318", author: "Walt Disney" },
    { textKey: "quotes.q319", author: "Martin Luther King Jr." },
    { textKey: "quotes.q320", author: "Brené Brown" },
    { textKey: "quotes.q321", author: "Og Mandino" },
    { textKey: "quotes.q322", author: "Muhammad Ali" },
    { textKey: "quotes.q323", author: "Tony Robbins" },
    { textKey: "quotes.q324", author: "Grant Cardone" },
    { textKey: "quotes.q325", author: "Wayne Dyer" },
    { textKey: "quotes.q326", author: "Plato" },
    { textKey: "quotes.q327", author: "Susan Jeffers" },
    { textKey: "quotes.q328", author: "Paulo Coelho" },
    { textKey: "quotes.q329", author: "Brené Brown" },
    { textKey: "quotes.q330", author: "Denzel Washington" },
    { textKey: "quotes.q331", author: "Nelson Mandela" },
    { textKey: "quotes.q332", author: "Robin Sharma" },
    { textKey: "quotes.q333", author: "Mark Twain" },
    { textKey: "quotes.q334", author: "Brené Brown" },
    { textKey: "quotes.q335", author: "David Goggins" },
    { textKey: "quotes.q336", author: "Nelson Mandela" },
    { textKey: "quotes.q337", author: "Elon Musk" },
    { textKey: "quotes.q338", author: "Tony Robbins" },
    { textKey: "quotes.q339", author: "Winston Churchill" },
    { textKey: "quotes.q340", author: "Mark Victor Hansen" },
    { textKey: "quotes.q341", author: "Teddy Roosevelt" },
    { textKey: "quotes.q342", author: "Buddha" },
    { textKey: "quotes.q343", author: "Martin Luther King Jr." },
    { textKey: "quotes.q344", author: "Robin Sharma" },
    { textKey: "quotes.q345", author: "Brené Brown" },
    { textKey: "quotes.q346", author: "Les Brown" },
    { textKey: "quotes.q347", author: "Tony Robbins" },
    { textKey: "quotes.q348", author: "Sun Tzu" },
    { textKey: "quotes.q349", author: "Gary Vaynerchuk" },
    { textKey: "quotes.q350", author: "David Goggins" },

    // Health & Fitness (351-400)
    { textKey: "quotes.q351", author: "Astrid Alauda" },
    { textKey: "quotes.q352", author: "Dalai Lama" },
    { textKey: "quotes.q353", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q354", author: "Jim Rohn" },
    { textKey: "quotes.q355", author: "Thales" },
    { textKey: "quotes.q356", author: "John Ratey" },
    { textKey: "quotes.q357", author: "Jim Rohn" },
    { textKey: "quotes.q358", author: "Hippocrates" },
    { textKey: "quotes.q359", author: "Louise Hay" },
    { textKey: "quotes.q360", author: "Mahatma Gandhi" },
    { textKey: "quotes.q361", author: "Richard Branson" },
    { textKey: "quotes.q362", author: "Robin Sharma" },
    { textKey: "quotes.q363", author: "Jocko Willink" },
    { textKey: "quotes.q364", author: "Michelle Obama" },
    { textKey: "quotes.q365", author: "Dr. Mark Hyman" },
    { textKey: "quotes.q366", author: "Elle Macpherson" },
    { textKey: "quotes.q367", author: "Jim Rohn" },
    { textKey: "quotes.q368", author: "Jack LaLanne" },
    { textKey: "quotes.q369", author: "Jocko Willink" },
    { textKey: "quotes.q370", author: "Tony Robbins" },
    { textKey: "quotes.q371", author: "Ann Wigmore" },
    { textKey: "quotes.q372", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q373", author: "David Goggins" },
    { textKey: "quotes.q374", author: "Richard Branson" },
    { textKey: "quotes.q375", author: "Hippocrates" },
    { textKey: "quotes.q376", author: "Plato" },
    { textKey: "quotes.q377", author: "Michelle Obama" },
    { textKey: "quotes.q378", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q379", author: "Robin Sharma" },
    { textKey: "quotes.q380", author: "Frank Sonnenberg" },
    { textKey: "quotes.q381", author: "David Goggins" },
    { textKey: "quotes.q382", author: "Buddha" },
    { textKey: "quotes.q383", author: "John F. Kennedy" },
    { textKey: "quotes.q384", author: "Tony Robbins" },
    { textKey: "quotes.q385", author: "Elle Macpherson" },
    { textKey: "quotes.q386", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q387", author: "Hippocrates" },
    { textKey: "quotes.q388", author: "Jocko Willink" },
    { textKey: "quotes.q389", author: "Oprah Winfrey" },
    { textKey: "quotes.q390", author: "Astrid Alauda" },
    { textKey: "quotes.q391", author: "Deepak Chopra" },
    { textKey: "quotes.q392", author: "John Ratey" },
    { textKey: "quotes.q393", author: "David Goggins" },
    { textKey: "quotes.q394", author: "World Health Organization" },
    { textKey: "quotes.q395", author: "Jack LaLanne" },
    { textKey: "quotes.q396", author: "Ann Wigmore" },
    { textKey: "quotes.q397", author: "Arnold Schwarzenegger" },
    { textKey: "quotes.q398", author: "Virgil" },
    { textKey: "quotes.q399", author: "Dalai Lama" },
    { textKey: "quotes.q400", author: "Robin Sharma" },
];

/**
 * Get daily quote based on server date
 */
function getDailyQuote(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const startOfYear = new Date(year, 0, 1);
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;

    const index = dayOfYear % quoteAuthors.length;
    return quoteAuthors[index];
}

/**
 * Get current server date in YYYY-MM-DD format
 */
function getServerDateKey() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Send push notification via Expo Push API
 * Sends textKey so client can translate based on user's language
 */
async function sendPushNotification(token, quote) {
    const message = {
        to: token,
        sound: 'default',
        title: '💪 Motivasyon',
        body: 'Günlük motivasyonunu görmek için tıkla',
        data: {
            textKey: quote.textKey,
            author: quote.author,
            type: 'daily_quote'
        },
        priority: 'high',
        channelId: 'daily-motivation',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    return response.json();
}

/**
 * Main request handler
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Register token endpoint
        if (url.pathname === '/register' && request.method === 'POST') {
            try {
                const { token, language } = await request.json();

                if (!token) {
                    return new Response(JSON.stringify({ error: 'Token required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Store token with registration date and language preference
                const metadata = JSON.stringify({
                    registeredAt: Date.now(),
                    lastNotified: null,
                    language: language || 'tr'
                });
                await env.TOKENS.put(token, metadata);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // Unregister token endpoint
        if (url.pathname === '/unregister' && request.method === 'POST') {
            try {
                const { token } = await request.json();
                await env.TOKENS.delete(token);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        return new Response('GymBuddy Notification Service', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
    },

    /**
     * Scheduled (Cron) handler - Runs daily at 9:00 AM Turkey time (6:00 AM UTC)
     * Add trigger: 0 6 * * *
     */
    async scheduled(event, env, ctx) {
        console.log('🔔 [Cron] Starting daily notification job...');

        try {
            // Get today's quote
            const dateKey = getServerDateKey();
            const quote = getDailyQuote(dateKey);

            console.log(`📜 [Cron] Today's quote (${dateKey}):`, quote);

            // Get all registered tokens
            const tokens = await env.TOKENS.list();

            console.log(`👥 [Cron] Found ${tokens.keys.length} registered tokens`);

            // Send notifications to all tokens (with dedup check)
            const promises = tokens.keys.map(async ({ name: token }) => {
                try {
                    // Check if already notified today
                    const storedValue = await env.TOKENS.get(token);
                    let metadata = { registeredAt: Date.now(), lastNotified: null };

                    try {
                        if (storedValue) {
                            metadata = JSON.parse(storedValue);
                        }
                    } catch (e) {
                        metadata = { registeredAt: parseInt(storedValue) || Date.now(), lastNotified: null };
                    }

                    // Skip if already notified today
                    if (metadata.lastNotified === dateKey) {
                        console.log(`⏭️ [Cron] Skipping ${token.substring(0, 20)}... (already notified today)`);
                        return { token, success: true, skipped: true };
                    }

                    const result = await sendPushNotification(token, quote);

                    // Update lastNotified date
                    metadata.lastNotified = dateKey;
                    await env.TOKENS.put(token, JSON.stringify(metadata));

                    console.log(`✅ [Cron] Sent to ${token.substring(0, 20)}...`);
                    return { token, success: true, result };
                } catch (error) {
                    console.error(`❌ [Cron] Failed for ${token.substring(0, 20)}:`, error);
                    return { token, success: false, error: error.message };
                }
            });

            const results = await Promise.allSettled(promises);

            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const skippedCount = results.filter(r => r.status === 'fulfilled' && r.value.skipped).length;
            const failCount = results.length - successCount;

            console.log(`🎉 [Cron] Notification job complete: ${successCount - skippedCount} sent, ${skippedCount} skipped, ${failCount} failed`);

        } catch (error) {
            console.error('❌ [Cron] Notification job failed:', error);
        }
    }
};
