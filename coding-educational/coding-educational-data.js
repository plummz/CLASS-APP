const codingEducationalData = (function () {
  'use strict';

  const img = {
    programming: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    frontend: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    backend: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    database: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    deploy: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    git: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1200&q=80',
    cyber: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    network: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
    linux: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80',
    api: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    mobile: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    ux: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=1200&q=80',
    engineering: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    testing: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    dsa: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80',
  };

  const source = {
    oracle: { name: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    mdn: { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    python: { name: 'Python Official Documentation', url: 'https://docs.python.org/3/' },
    git: { name: 'Git Documentation', url: 'https://git-scm.com/doc' },
    owasp: { name: 'OWASP Foundation', url: 'https://owasp.org/www-project-top-ten/' },
    postgres: { name: 'PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/' },
    php: { name: 'PHP Manual', url: 'https://www.php.net/manual/en/' },
    ruby: { name: 'Ruby Documentation', url: 'https://www.ruby-lang.org/en/documentation/' },
    cpp: { name: 'cppreference', url: 'https://en.cppreference.com/' },
    dotnet: { name: 'Microsoft C# Documentation', url: 'https://learn.microsoft.com/dotnet/csharp/' },
    typescript: { name: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/' },
    docker: { name: 'Docker Documentation', url: 'https://docs.docker.com/' },
    android: { name: 'Android Developers', url: 'https://developer.android.com/docs' },
    ux: { name: 'Nielsen Norman Group', url: 'https://www.nngroup.com/articles/' },
    cloud: { name: 'AWS Cloud Concepts', url: 'https://aws.amazon.com/what-is-cloud-computing/' },
    testing: { name: 'ISTQB Glossary', url: 'https://glossary.istqb.org/' },
    linux: { name: 'Linux Foundation Resources', url: 'https://www.linuxfoundation.org/resources/' },
  };

  function id(value) {
    return String(value).toLowerCase().replace(/c\+\+/g, 'cpp').replace(/c#/g, 'csharp').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function lesson(prefix, title, summary, keyPoints, code, recap, sources, tags = []) {
    return {
      id: id(`${prefix}-${title}`),
      title,
      readingTime: `${Math.max(4, Math.min(8, Math.ceil((summary.length + keyPoints.join('').length) / 160)))} min`,
      tags: ['Beginner', ...tags],
      summary,
      keyPoints,
      example: {
        title: `${title} Example`,
        code,
      },
      recap,
      sources,
    };
  }

  function makeQuiz(chapterId, lessons) {
    const usable = lessons.slice(0, 5);
    return usable.map((item, index) => ({
      id: `${chapterId}-q${index + 1}`,
      question: `Which idea best matches "${item.title}"?`,
      choices: [
        item.recap,
        'It is only used by advanced developers and should be skipped by beginners.',
        'It is unrelated to building software projects.',
        'It is a visual design choice only.',
      ],
      answerIndex: 0,
    }));
  }

  function chapter(title, description, lessons) {
    const chapterId = id(title);
    return {
      id: chapterId,
      title,
      description,
      level: 'Beginner',
      lessons,
      quiz: makeQuiz(chapterId, lessons),
    };
  }

  function buildBookChapters(title, lessons) {
    if (lessons.length <= 5) {
      return [chapter(`${title} Foundations`, `Start with the essential ideas in ${title}.`, lessons)];
    }
    const midpoint = Math.ceil(lessons.length / 2);
    return [
      chapter(`${title} Foundations`, `Start with the essential ideas in ${title}.`, lessons.slice(0, midpoint)),
      chapter(`${title} Practice Book`, `Continue with more ${title} lessons and practical examples.`, lessons.slice(midpoint)),
    ];
  }

  function subfolder(title, description, image, lessons, level = 'Beginner') {
    return { id: id(title), title, description, level, image, chapters: buildBookChapters(title, lessons) };
  }

  function category(title, description, image, subfolders, level = 'Beginner') {
    return { id: id(title), title, description, level, image, subfolders };
  }

  function simpleLessons(prefix, tag, titles, sources, code, topic) {
    return titles.map((title) => lesson(
      prefix,
      title,
      `${title} is a beginner topic in ${topic}. It helps you understand how real projects are organized and how small correct steps become working software.`,
      [
        `${title} should be learned through small examples first.`,
        'Good naming and clear structure make code easier to read.',
        'Practice by changing one part, running it, and checking the result.',
      ],
      code,
      `${title} is part of the foundation you need before building larger apps.`,
      sources,
      [tag]
    ));
  }

  const javaLessons = [
    lesson('java', 'Introduction to Java',
      'Java is a programming language used for desktop apps, backend systems, Android development, and school programming exercises. Java code is compiled and then runs on the Java Virtual Machine, which helps it work on many systems.',
      ['Java is object-oriented.', 'Java programs usually start from a class.', 'The main method is the entry point of a basic Java program.'],
      'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}',
      'Java is a flexible language. Start with simple output, then slowly add variables, decisions, loops, and classes.',
      [source.oracle], ['Java']),
    lesson('java', 'Data Types',
      'Data types tell Java what kind of value a variable can store. Choosing the right type helps the program use memory and operations correctly.',
      ['int stores whole numbers.', 'double stores decimal numbers.', 'char stores one character.', 'boolean stores true or false.'],
      "int age = 19;\ndouble grade = 95.5;\nchar section = 'A';\nboolean passed = true;",
      'Use a data type that matches the value you need to store.',
      [source.oracle], ['Java']),
    lesson('java', 'Variables',
      'A variable is a named storage space for a value. In Java, you declare the type first, then the variable name.',
      ['Variables need a type.', 'Use meaningful names.', 'A variable value can change unless it is final.'],
      'String studentName = "Mika";\nint score = 88;\nscore = 92;',
      'Variables make programs remember values and reuse them later.',
      [source.oracle], ['Java']),
    lesson('java', 'Operators',
      'Operators are symbols that perform actions on values, such as math, comparison, or logic.',
      ['+ adds values or joins text.', '== compares equality.', '&& means both conditions must be true.'],
      'int total = 10 + 5;\nboolean passed = total >= 15;',
      'Operators let your program calculate and compare values.',
      [source.oracle], ['Java']),
    lesson('java', 'Conditions',
      'Conditions let Java choose what code to run based on true or false checks.',
      ['if runs code when a condition is true.', 'else runs an alternate path.', 'else if checks another condition.'],
      'int grade = 85;\nif (grade >= 75) {\n  System.out.println("Passed");\n} else {\n  System.out.println("Try again");\n}',
      'Conditions help programs make decisions.',
      [source.oracle], ['Java']),
    lesson('java', 'Loops',
      'Loops repeat code without copying the same lines many times.',
      ['for loops are useful when you know the count.', 'while loops repeat while a condition is true.', 'Avoid infinite loops by updating the condition.'],
      'for (int i = 1; i <= 3; i++) {\n  System.out.println(i);\n}',
      'Loops are best for repeated tasks like counting, listing, and searching.',
      [source.oracle], ['Java']),
    lesson('java', 'Methods',
      'Methods group instructions under one name so you can reuse them.',
      ['A method can receive parameters.', 'A method can return a value.', 'Methods keep code organized.'],
      'static int add(int a, int b) {\n  return a + b;\n}',
      'Methods make programs easier to read, test, and reuse.',
      [source.oracle], ['Java']),
    lesson('java', 'Arrays',
      'An array stores multiple values of the same type in one variable.',
      ['Array indexes start at 0.', 'Arrays have a fixed length.', 'Use loops to read many array items.'],
      'int[] scores = {90, 85, 92};\nSystem.out.println(scores[0]);',
      'Arrays are useful when many related values belong together.',
      [source.oracle], ['Java']),
    lesson('java', 'OOP',
      'Object-oriented programming organizes code using classes and objects. A class is like a blueprint, while an object is a real item made from that blueprint.',
      ['Classes describe data and behavior.', 'Objects are created from classes.', 'Fields store object data and methods define actions.'],
      'class Student {\n  String name;\n  void greet() {\n    System.out.println("Hi " + name);\n  }\n}',
      'OOP helps organize larger programs into meaningful parts.',
      [source.oracle], ['Java', 'OOP']),
    lesson('java', 'Swing',
      'Java Swing is a toolkit for building basic desktop graphical interfaces with windows, labels, buttons, and text fields.',
      ['JFrame is a window.', 'JButton creates a clickable button.', 'Swing apps need event listeners for actions.'],
      'JFrame frame = new JFrame("Demo");\nJButton button = new JButton("Click");\nframe.add(button);\nframe.pack();',
      'Swing is useful for learning GUI structure, even when server environments cannot display windows.',
      [source.oracle], ['Java', 'Swing']),
  ];

  const htmlLessons = [
    ['Introduction', 'HTML gives structure to a webpage. It tells the browser what content exists, such as headings, paragraphs, links, images, and forms.', ['HTML is markup, not a programming language.', 'Tags describe page parts.', 'Browsers read HTML to build the page structure.'], '<!doctype html>\n<html>\n  <body>Hello HTML</body>\n</html>', 'HTML is the skeleton of a webpage.'],
    ['Elements', 'An HTML element usually has an opening tag, content, and a closing tag.', ['Elements can contain text.', 'Elements can be nested.', 'Some elements are self-closing or void elements.'], '<p>This is a paragraph element.</p>', 'Elements are the basic building blocks of HTML.'],
    ['Headings', 'Headings organize a page into titles and sections.', ['h1 is usually the main page title.', 'Use headings in order when possible.', 'Headings help readers and assistive tools.'], '<h1>Main Title</h1>\n<h2>Section Title</h2>', 'Headings make content easier to scan.'],
    ['Paragraphs', 'Paragraphs hold normal blocks of text.', ['Use p for readable text sections.', 'Do not use paragraphs only for spacing.', 'CSS should handle visual spacing.'], '<p>This lesson is for beginners.</p>', 'Paragraphs are for readable content.'],
    ['Links', 'Links let users move to another page, section, or resource.', ['a creates a link.', 'href stores the destination.', 'Link text should describe where it goes.'], '<a href="https://developer.mozilla.org/">Visit MDN</a>', 'Links connect pages and resources.'],
    ['Images', 'Images add visual information to a page.', ['img uses src for the file path.', 'alt explains the image.', 'Use images that support the content.'], '<img src="photo.jpg" alt="Student coding">', 'Images need clear alt text for accessibility.'],
    ['Lists', 'Lists organize related items.', ['ul creates unordered lists.', 'ol creates numbered lists.', 'li is each list item.'], '<ul>\n  <li>HTML</li>\n  <li>CSS</li>\n</ul>', 'Lists make grouped information neat.'],
    ['Tables', 'Tables show data in rows and columns.', ['table wraps the data.', 'tr is a row.', 'th and td are header and data cells.'], '<table>\n  <tr><th>Name</th><th>Score</th></tr>\n  <tr><td>Ana</td><td>95</td></tr>\n</table>', 'Tables are for tabular data, not page layout.'],
    ['Forms', 'Forms collect user input.', ['input collects short values.', 'label explains an input.', 'button submits or triggers actions.'], '<label>Name <input name="name"></label>\n<button>Save</button>', 'Forms are how users send data.'],
    ['Semantic HTML', 'Semantic HTML uses tags that describe meaning, like header, main, section, and footer.', ['Semantic tags improve structure.', 'They help accessibility.', 'They make code easier to understand.'], '<main>\n  <section>\n    <h2>Lessons</h2>\n  </section>\n</main>', 'Semantic HTML makes pages clearer for people and tools.'],
  ].map(([title, summary, points, code, recap]) => lesson('html', title, summary, points, code, recap, [source.mdn], ['HTML']));

  const cssLessons = [
    ['Introduction', 'CSS controls the appearance of HTML. It handles colors, spacing, layout, borders, and animation.', ['CSS separates style from structure.', 'Selectors choose what to style.', 'Rules contain properties and values.'], 'p {\n  color: blue;\n}', 'CSS makes webpages readable and visually organized.'],
    ['Selectors', 'Selectors tell CSS which HTML elements to style.', ['Element selectors target tag names.', 'Class selectors start with a dot.', 'ID selectors start with #.'], '.card {\n  padding: 16px;\n}', 'Selectors connect CSS rules to HTML elements.'],
    ['Colors', 'CSS colors can use names, hex values, rgb, hsl, and variables.', ['Use enough contrast.', 'Keep palettes consistent.', 'Variables help reuse colors.'], ':root {\n  --accent: #00d4ff;\n}', 'Good color choices improve readability.'],
    ['Box Model', 'The box model describes content, padding, border, and margin.', ['Content is the inner area.', 'Padding is inside spacing.', 'Margin is outside spacing.'], '.box {\n  padding: 12px;\n  margin: 10px;\n}', 'The box model explains how elements take space.'],
    ['Padding/Margin', 'Padding creates space inside an element, while margin creates space outside it.', ['Padding affects the inside feel.', 'Margin separates elements.', 'Use consistent spacing.'], '.button {\n  padding: 10px 14px;\n  margin-top: 12px;\n}', 'Spacing makes layouts calmer and easier to read.'],
    ['Flexbox', 'Flexbox arranges items in one direction, either row or column.', ['display:flex enables it.', 'gap creates space between items.', 'justify-content and align-items control alignment.'], '.row {\n  display: flex;\n  gap: 12px;\n}', 'Flexbox is great for toolbars, cards, and centered content.'],
    ['Grid', 'CSS Grid arranges content in rows and columns.', ['Grid is useful for card layouts.', 'repeat() avoids repeated column code.', 'gap controls spacing.'], '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}', 'Grid helps build clean two-dimensional layouts.'],
    ['Responsive Design', 'Responsive design makes pages work on different screen sizes.', ['Use flexible widths.', 'Use media queries only when needed.', 'Test on mobile and desktop.'], '@media (max-width: 600px) {\n  .grid { grid-template-columns: 1fr; }\n}', 'Responsive pages adapt instead of breaking.'],
    ['Animations', 'Animations show movement and feedback when used carefully.', ['Keep animations short.', 'Use transitions for hover or press feedback.', 'Avoid motion that distracts.'], '.button {\n  transition: transform 120ms ease;\n}\n.button:active {\n  transform: scale(.96);\n}', 'Good animation makes interfaces feel responsive.'],
  ].map(([title, summary, points, code, recap]) => lesson('css', title, summary, points, code, recap, [source.mdn], ['CSS']));

  const jsLessons = [
    ['Introduction', 'JavaScript adds behavior to webpages. It can update content, react to clicks, validate forms, and talk to APIs.', ['JavaScript runs in browsers.', 'It can change the DOM.', 'It is also used on servers with Node.js.'], 'console.log("Hello JavaScript");', 'JavaScript makes webpages interactive.'],
    ['Variables', 'Variables store values so a program can use them later.', ['let is used for changeable values.', 'const is used when reassignment is not needed.', 'Use clear names.'], 'const name = "Ana";\nlet score = 90;', 'Variables help programs remember information.'],
    ['Data Types', 'JavaScript values can be strings, numbers, booleans, arrays, objects, null, or undefined.', ['Strings store text.', 'Numbers store numeric values.', 'Booleans store true or false.'], 'const passed = true;\nconst grade = 95;', 'Knowing data types helps avoid confusing bugs.'],
    ['Operators', 'Operators perform actions like math, comparison, and logic.', ['+ can add or join strings.', '=== checks strict equality.', '&& means both conditions are true.'], 'const total = 10 + 5;\nconst passed = total >= 15;', 'Operators are small symbols that make decisions and calculations possible.'],
    ['Functions', 'Functions group reusable instructions.', ['Functions can receive parameters.', 'Functions can return values.', 'Use functions to avoid repeated code.'], 'function add(a, b) {\n  return a + b;\n}', 'Functions keep code organized.'],
    ['Arrays', 'Arrays store ordered lists of values.', ['Indexes start at 0.', 'push adds an item.', 'map and forEach help process items.'], 'const subjects = ["HTML", "CSS", "JS"];\nconsole.log(subjects[0]);', 'Arrays are useful for lists.'],
    ['Objects', 'Objects store related values using property names.', ['Objects use key-value pairs.', 'Use dot notation to read properties.', 'Objects model real things.'], 'const student = {\n  name: "Mika",\n  year: 1\n};', 'Objects group related data.'],
    ['DOM', 'The DOM is the browser representation of the HTML page. JavaScript can read and change it.', ['querySelector finds elements.', 'textContent changes text.', 'classList changes classes.'], 'document.querySelector("h1").textContent = "Updated";', 'DOM skills let you control page content.'],
    ['Events', 'Events happen when users click, type, scroll, or interact with a page.', ['addEventListener listens for events.', 'Click events are common.', 'Keep event code small and clear.'], 'button.addEventListener("click", () => {\n  console.log("Clicked");\n});', 'Events connect user actions to code.'],
    ['Conditions', 'Conditions let JavaScript choose between paths.', ['if checks a condition.', 'else handles the other path.', 'Use clear comparisons.'], 'if (score >= 75) {\n  console.log("Passed");\n}', 'Conditions make programs react to different situations.'],
    ['Loops', 'Loops repeat code while a condition or list still has work.', ['for loops use counters.', 'for...of reads arrays cleanly.', 'Avoid infinite loops.'], 'for (const item of subjects) {\n  console.log(item);\n}', 'Loops reduce repeated code.'],
  ].map(([title, summary, points, code, recap]) => lesson('javascript', title, summary, points, code, recap, [source.mdn], ['JavaScript']));

  const pythonLessons = [
    ['Introduction', 'Python is a beginner-friendly programming language used for automation, web apps, data work, AI, and scripting.', ['Python uses indentation.', 'It has readable syntax.', 'It is popular in schools and industry.'], 'print("Hello, Python!")', 'Python is a good first language because the code is easy to read.'],
    ['Variables', 'Python variables store values without writing the type first.', ['Names should be clear.', 'Values can change.', 'Python detects the type from the value.'], 'name = "Ana"\nage = 19', 'Python variables are quick to write and easy to read.'],
    ['Data Types', 'Python has strings, integers, floats, booleans, lists, dictionaries, and more.', ['str stores text.', 'int stores whole numbers.', 'bool stores True or False.'], 'grade = 95.5\npassed = True', 'Data types describe what kind of value you are using.'],
    ['Input/Output', 'Input lets users type values, and output shows results.', ['input() reads text.', 'print() displays output.', 'Convert input when you need numbers.'], 'name = input("Name: ")\nprint("Hello", name)', 'Input and output make programs interactive.'],
    ['Conditions', 'Python conditions use if, elif, and else.', ['Indentation matters.', 'Use comparison operators.', 'elif checks another case.'], 'if grade >= 75:\n    print("Passed")\nelse:\n    print("Try again")', 'Conditions let Python make decisions.'],
    ['Loops', 'Loops repeat work for lists or while a condition is true.', ['for is common with lists.', 'while repeats while true.', 'Update loop values carefully.'], 'for number in range(1, 4):\n    print(number)', 'Loops save time when tasks repeat.'],
    ['Functions', 'Functions group code under one name.', ['def creates a function.', 'Parameters receive values.', 'return sends a result back.'], 'def add(a, b):\n    return a + b', 'Functions make code reusable.'],
    ['Lists', 'Lists store multiple values in order.', ['Indexes start at 0.', 'append adds an item.', 'Loops can read each item.'], 'subjects = ["HTML", "CSS", "Python"]\nsubjects.append("Java")', 'Lists are useful for collections.'],
    ['Dictionaries', 'Dictionaries store values by key.', ['Keys describe values.', 'Use square brackets to read a key.', 'They are useful for records.'], 'student = {"name": "Mika", "year": 1}\nprint(student["name"])', 'Dictionaries group named information.'],
    ['OOP basics', 'Object-oriented programming in Python uses classes and objects to organize data and behavior.', ['class creates a blueprint.', 'self refers to the object.', 'Methods are functions inside classes.'], 'class Student:\n    def __init__(self, name):\n        self.name = name', 'OOP helps organize larger Python programs.'],
  ].map(([title, summary, points, code, recap]) => lesson('python', title, summary, points, code, recap, [source.python], ['Python']));

  const gitBasics = [
    ['What is Git', 'Git tracks project changes so you can save work, compare versions, and recover from mistakes.', ['Git works inside a repository.', 'It saves snapshots called commits.', 'It helps teams collaborate safely.'], 'git status', 'Git is a safety net for your code.'],
    ['Repository', 'A repository is a project folder that Git is tracking.', ['It contains your files.', 'Git stores history in a hidden .git folder.', 'Use one repository per project.'], 'git init', 'A repository is where version control begins.'],
    ['Commit', 'A commit is a saved snapshot of your changes with a message.', ['Commits should be focused.', 'Messages should describe the change.', 'You can inspect commit history later.'], 'git add index.html\ngit commit -m "add homepage"', 'Commits make progress traceable.'],
    ['Push and Pull', 'Push sends commits to a remote repository. Pull downloads changes from the remote.', ['Push shares your work.', 'Pull gets team updates.', 'Pull before pushing when collaborating.'], 'git pull origin main\ngit push origin main', 'Push and pull keep local and remote work connected.'],
    ['Branches', 'Branches let you work on changes separately before merging them.', ['main usually holds stable code.', 'Feature branches isolate work.', 'Merge when the feature is ready.'], 'git switch -c feature-login', 'Branches reduce risk while building features.'],
  ].map(([title, summary, points, code, recap]) => lesson('git-basics', title, summary, points, code, recap, [source.git], ['Git']));

  const cybersecurityBasics = [
    ['What is Cybersecurity', 'Cybersecurity protects systems, accounts, data, and users from harm or misuse.', ['It includes prevention, detection, and response.', 'Human habits matter.', 'Security should be built into apps early.'], 'Use strong passwords and update software regularly.', 'Cybersecurity is about reducing risk.'],
    ['CIA Triad', 'The CIA triad means confidentiality, integrity, and availability.', ['Confidentiality protects private data.', 'Integrity keeps data correct.', 'Availability keeps systems usable.'], 'A school portal should keep grades private, correct, and available.', 'CIA helps explain the goals of security.'],
    ['Password Safety', 'Password safety means using strong, unique passwords and extra verification when possible.', ['Do not reuse passwords.', 'Use MFA when available.', 'Never store plain-text passwords.'], 'Use a password manager to create unique passwords.', 'Strong account habits prevent many attacks.'],
    ['Phishing Awareness', 'Phishing tricks users into giving information through fake messages, links, or pages.', ['Check the sender.', 'Do not rush urgent messages.', 'Avoid opening suspicious links.'], 'If a message asks for your password, verify through an official channel.', 'Slowing down helps you avoid phishing.'],
    ['Secure Coding Basics', 'Secure coding means writing code that handles input, errors, and access carefully.', ['Validate input.', 'Escape output when showing user text.', 'Check permissions on the server.'], 'if (!currentUser) return res.status(401).json({ error: "Login required" });', 'Secure coding protects users and data.'],
  ].map(([title, summary, points, code, recap]) => lesson('cybersecurity-basics', title, summary, points, code, recap, [source.owasp], ['Cybersecurity']));

  const sqlBasics = [
    ['What is SQL', 'SQL is a language used to work with relational databases. It can read, add, update, and delete records.', ['SQL works with tables.', 'Rows are records.', 'Columns are fields.'], 'SELECT * FROM students;', 'SQL helps apps talk to databases.'],
    ['SELECT', 'SELECT reads data from a table.', ['Choose columns instead of always using *.', 'WHERE filters results.', 'ORDER BY sorts results.'], 'SELECT name, course\nFROM students\nWHERE year_level = 1;', 'SELECT is the main command for reading data.'],
    ['INSERT', 'INSERT adds a new row to a table.', ['List the columns.', 'Provide matching values.', 'Validate data before inserting.'], "INSERT INTO students (name, course)\nVALUES ('Ana', 'BSIT');", 'INSERT stores new records.'],
    ['UPDATE', 'UPDATE changes existing rows.', ['Use WHERE to avoid updating every row.', 'Update only needed columns.', 'Check the target record first.'], "UPDATE students\nSET course = 'BSIT'\nWHERE id = 1;", 'UPDATE edits existing data.'],
    ['DELETE', 'DELETE removes rows from a table.', ['Use WHERE carefully.', 'Backups are important.', 'Some apps use soft delete instead.'], 'DELETE FROM students\nWHERE id = 1;', 'DELETE should be used carefully because it removes data.'],
    ['Keys and Relationships', 'Keys connect tables and keep records organized.', ['Primary keys identify rows.', 'Foreign keys refer to another table.', 'Relationships reduce repeated data.'], 'CREATE TABLE enrollments (\n  student_id INT,\n  subject_id INT\n);', 'Keys help databases model real information.'],
  ].map(([title, summary, points, code, recap]) => lesson('sql-basics', title, summary, points, code, recap, [source.postgres], ['SQL', 'Database']));

  const languageShort = {
    Ruby: [source.ruby, 'puts "Hello, Ruby!"'],
    PHP: [source.php, '<?php echo "Hello, PHP!"; ?>'],
    SQL: [source.postgres, 'SELECT title FROM lessons;'],
    C: [source.cpp, '#include <stdio.h>\nint main(void) { printf("Hello C"); return 0; }'],
    'C++': [source.cpp, '#include <iostream>\nint main() { std::cout << "Hello C++"; }'],
    'C#': [source.dotnet, 'Console.WriteLine("Hello C#");'],
    TypeScript: [source.typescript, 'let score: number = 95;'],
  };

  const programmingSubfolders = [
    subfolder('Java', 'Learn Java basics, object-oriented programming, and GUI concepts.', img.programming, javaLessons),
    subfolder('HTML', 'Learn the structure of webpages.', img.frontend, htmlLessons),
    subfolder('CSS', 'Learn how to style webpages clearly and responsively.', img.frontend, cssLessons),
    subfolder('JavaScript', 'Learn browser programming and basic app logic.', img.frontend, jsLessons),
    subfolder('Python', 'Learn readable programming syntax for scripts, apps, and data work.', img.programming, pythonLessons),
    ...Object.entries(languageShort).map(([name, [src, code]]) => subfolder(name, `Beginner ${name} concepts and short examples.`, img.programming, simpleLessons(id(name), name, ['Introduction', 'Variables', 'Data Types', 'Conditions', 'Loops'], [src], code, name))),
  ];

  return [
    category('Programming Languages', 'Learn the core languages used in software and web development.', img.programming, programmingSubfolders),
    category('Front End', 'Build the visible part of websites with structure, style, and interaction.', img.frontend, [
      subfolder('Web Basics', 'How browsers, HTML, CSS, and JavaScript work together.', img.frontend, simpleLessons('web-basics', 'Front End', ['How Web Pages Load', 'HTML CSS JS Roles', 'Browser DevTools'], [source.mdn], '<script src="app.js"></script>', 'front-end development')),
      subfolder('Responsive Design', 'Make layouts work on phones, tablets, and desktops.', img.frontend, simpleLessons('responsive-design', 'Responsive', ['Flexible Layouts', 'Media Queries', 'Mobile First'], [source.mdn], '@media (max-width: 600px) { .card { width: 100%; } }', 'responsive design')),
      subfolder('DOM Manipulation', 'Use JavaScript to read and update page content.', img.frontend, simpleLessons('dom-manipulation', 'DOM', ['Selecting Elements', 'Changing Text', 'Toggling Classes'], [source.mdn], 'document.querySelector(".title").textContent = "Hi";', 'DOM manipulation')),
      subfolder('React Basics', 'Understand components, props, and state at a beginner level.', img.frontend, simpleLessons('react-basics', 'React', ['Components', 'Props', 'State'], [source.mdn], 'function Card(props) { return <h2>{props.title}</h2>; }', 'React basics')),
      subfolder('UI Components', 'Reusable buttons, cards, inputs, and panels.', img.ux, simpleLessons('ui-components', 'UI', ['Buttons', 'Cards', 'Forms'], [source.ux], '<button class="primary">Save</button>', 'UI components')),
    ]),
    category('Back End', 'Understand servers, routes, data validation, and secure app logic.', img.backend, [
      subfolder('Server Basics', 'Requests, responses, routes, and server responsibilities.', img.backend, simpleLessons('server-basics', 'Back End', ['Requests and Responses', 'Routes', 'Middleware'], [source.mdn], 'app.get("/api/status", (req, res) => res.json({ ok: true }));', 'server development')),
      subfolder('APIs', 'Build endpoints that apps can use.', img.api, simpleLessons('backend-apis', 'API', ['Endpoints', 'JSON Responses', 'Status Codes'], [source.mdn], 'res.status(201).json({ saved: true });', 'backend APIs')),
      subfolder('Authentication Basics', 'Login, sessions, and permission checks.', img.cyber, simpleLessons('auth-basics', 'Auth', ['Login Flow', 'Sessions', 'Authorization'], [source.owasp], 'if (!user) return res.status(401).send("Login required");', 'authentication')),
      subfolder('Node.js Basics', 'Run JavaScript on the server.', img.backend, simpleLessons('node-basics', 'Node.js', ['Node Runtime', 'npm Packages', 'Express Basics'], [source.mdn], 'console.log("Server starting");', 'Node.js')),
      subfolder('Database Connection Basics', 'Connect server code to stored data.', img.database, simpleLessons('db-connection-basics', 'Database', ['Connection Strings', 'Queries', 'Error Handling'], [source.postgres], 'const rows = await db.query("SELECT * FROM users");', 'database connections')),
    ]),
    category('Databases', 'Store, query, and protect app data.', img.database, [
      subfolder('Database Basics', 'Tables, rows, columns, and records.', img.database, simpleLessons('database-basics', 'Database', ['Tables', 'Rows', 'Columns'], [source.postgres], 'CREATE TABLE students (id INT, name TEXT);', 'database basics')),
      subfolder('SQL Basics', 'Read and change records with SQL.', img.database, sqlBasics),
      subfolder('Tables and Records', 'Organize data into useful table structures.', img.database, simpleLessons('tables-records', 'Database', ['Table Design', 'Records', 'Columns'], [source.postgres], 'CREATE TABLE lessons (id SERIAL PRIMARY KEY, title TEXT);', 'tables and records')),
      subfolder('CRUD Operations', 'Create, read, update, and delete data.', img.database, simpleLessons('crud-operations', 'CRUD', ['Create', 'Read', 'Update', 'Delete'], [source.postgres], 'SELECT * FROM lessons;', 'CRUD')),
      subfolder('Keys and Relationships', 'Connect records using primary and foreign keys.', img.database, simpleLessons('keys-relationships', 'Database', ['Primary Keys', 'Foreign Keys', 'Relationships'], [source.postgres], 'FOREIGN KEY (user_id) REFERENCES users(id)', 'database relationships')),
    ]),
    category('Deployment Sites / Programs', 'Move a project from your computer to the internet.', img.deploy, ['GitHub','GitHub Pages','Netlify','Vercel','Render','Firebase','Supabase Basics'].map((name) => subfolder(name, `Beginner deployment notes for ${name}.`, img.deploy, simpleLessons(id(name), 'Deployment', ['Purpose', 'Setup Idea', 'Common Mistakes'], [source.git, source.docker], 'npm run build\nnpm start', name)))),
    category('Version Control', 'Track changes, collaborate, and recover safely.', img.git, [
      subfolder('Git Basics', 'Start tracking project changes safely.', img.git, gitBasics),
      ...['Repositories','Commit / Push / Pull','Branches','Merge Basics'].map((name) => subfolder(name, `${name} for beginner collaboration.`, img.git, simpleLessons(id(name), 'Git', ['Concept', 'Command', 'Practice Tip'], [source.git], 'git status', name))),
    ]),
    category('IT / Cybersecurity', 'Learn safe habits, common risks, and basic defense thinking.', img.cyber, [
      subfolder('Cybersecurity Basics', 'Understand security goals and everyday risks.', img.cyber, cybersecurityBasics),
      ...['Password Safety','Phishing Awareness','Secure Coding Basics','OWASP Basics'].map((name) => subfolder(name, `${name} explained for students.`, img.cyber, simpleLessons(id(name), 'Cybersecurity', ['Risk', 'Safe Habit', 'Example'], [source.owasp], 'Validate input before using it.', name))),
    ]),
    category('Networking Basics', 'Understand how devices and web apps communicate.', img.network, ['Internet Basics','IP Address','DNS','Routers and Switches','Client and Server'].map((name) => subfolder(name, `${name} in simple networking terms.`, img.network, simpleLessons(id(name), 'Networking', ['Meaning', 'Use', 'Troubleshooting'], [source.mdn, source.linux], 'ping example.com', name)))),
    category('Operating Systems / Linux Basics', 'Learn files, processes, permissions, and terminal habits.', img.linux, ['OS Basics','Command Line Basics','Files and Directories','Permissions','Basic Linux Commands'].map((name) => subfolder(name, `${name} for beginner system use.`, img.linux, simpleLessons(id(name), 'Linux', ['Concept', 'Command', 'Safety Tip'], [source.linux], 'pwd\nls\ncd Documents', name)))),
    category('APIs / Web Services', 'Connect apps through structured requests and responses.', img.api, ['What is an API','REST Basics','Request and Response','JSON Basics','API Testing Basics'].map((name) => subfolder(name, `${name} for web service beginners.`, img.api, simpleLessons(id(name), 'API', ['Endpoint', 'Data', 'Status'], [source.mdn], 'fetch("/api/items").then(r => r.json())', name)))),
    category('Mobile Development', 'Design and build apps for small touch screens.', img.mobile, ['Mobile App Basics','Android Basics','Cross-platform Basics'].map((name) => subfolder(name, `${name} for app development starters.`, img.mobile, simpleLessons(id(name), 'Mobile', ['Touch UI', 'Device Limits', 'Testing'], [source.android, source.mdn], 'button { min-height: 44px; }', name)))),
    category('UI / UX Basics', 'Make interfaces readable, useful, and comfortable.', img.ux, ['UI Basics','UX Basics','Layout Principles','Color and Typography','Accessibility Basics'].map((name) => subfolder(name, `${name} for usable interface design.`, img.ux, simpleLessons(id(name), 'UI/UX', ['Clarity', 'Feedback', 'Consistency'], [source.ux], 'Use clear labels and readable contrast.', name)))),
    category('Software Engineering Basics', 'Plan, structure, and maintain projects like a team.', img.engineering, ['SDLC','Debugging Basics','Testing Basics','Documentation','Clean Code Basics'].map((name) => subfolder(name, `${name} for project discipline.`, img.engineering, simpleLessons(id(name), 'Software Engineering', ['Plan', 'Build', 'Review'], [source.testing, source.git], 'Write one focused function at a time.', name)))),
    category('Cloud Basics', 'Understand hosted services, scaling, storage, and reliability.', img.cloud, ['What is Cloud Computing','Storage Basics','Hosting Basics','Backend Services Basics'].map((name) => subfolder(name, `${name} for cloud beginners.`, img.cloud, simpleLessons(id(name), 'Cloud', ['Service', 'Hosting', 'Reliability'], [source.cloud], 'A cloud service runs on provider-managed infrastructure.', name)))),
    category('Testing / Debugging', 'Find mistakes faster and prove features still work.', img.testing, ['Common Errors','Debugging Process','Console Logging','Basic Testing'].map((name) => subfolder(name, `${name} for finding and preventing bugs.`, img.testing, simpleLessons(id(name), 'Testing', ['Reproduce', 'Inspect', 'Verify'], [source.testing], 'console.log("value", value);', name)))),
    category('Data Structures and Algorithms Basics', 'Learn simple ways to organize data and solve problems.', img.dsa, ['Arrays','Strings','Searching','Sorting','Stack and Queue basics'].map((name) => subfolder(name, `${name} for beginner problem solving.`, img.dsa, simpleLessons(id(name), 'DSA', ['Data Shape', 'Steps', 'Practice'], [source.mdn], 'const found = items.find(item => item.id === targetId);', name)))),
  ];
})();

window.codingEducationalData = codingEducationalData;
