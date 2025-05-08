const DB_NAME = "schoolDb1";
const DB_VERSION = 1;

// Open or Create IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('students')) {
               const students= db.createObjectStore('students', { keyPath: 'adNumber' });
                students.createIndex('classDiv', 'classDiv', { unique: false });
            }
            if (!db.objectStoreNames.contains('adStudents')) {
                const students= db.createObjectStore('adStudents', { keyPath: 'adNumber' });
                 students.createIndex('currentClass', 'currentClass', { unique: false });
             }
            if (!db.objectStoreNames.contains('Allstudents')) {
                const students= db.createObjectStore('Allstudents', { keyPath: 'adNumber' });
                 students.createIndex('currentClass', 'currentClass', { unique: false });
             }

            if (!db.objectStoreNames.contains('feeData')) {
                db.createObjectStore('feeData', { keyPath: 'ADNUMBER' });
                //feedata.createIndex('NEW CLASS', 'NEW CLASS', { unique: false });
             }
            
            if (!db.objectStoreNames.contains('teachers')) {
                db.createObjectStore('teachers', { keyPath: 'email' });
            }
            
            if (!db.objectStoreNames.contains('tempData')) {
                db.createObjectStore('tempData', { keyPath: 'id' });
            }
            // Create object store for sync metadata
            if (!db.objectStoreNames.contains('syncMetadata')) {
                db.createObjectStore('syncMetadata', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('timetable')) {
                db.createObjectStore('timetable', { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains('maxMarks')) {
                const maxMarksStore = db.createObjectStore('maxMarks', { keyPath: 'class' });
                maxMarksStore.createIndex('class', 'class', { unique: false });
                maxMarksStore.createIndex('exam', 'exam', { unique: false });
                maxMarksStore.createIndex('subject', 'subject', { unique: false });
            }
            if (!db.objectStoreNames.contains('subjectCombination')) {
                const examsStore = db.createObjectStore('subjectCombination', { keyPath: 'className', autoIncrement:true});
                examsStore.createIndex('className', 'className', { unique: true });
                //examsStore.createIndex('examName', 'exam', { unique: false });
            }
            if (!db.objectStoreNames.contains('subjectCombo')) {
                const examsStore = db.createObjectStore('subjectCombo', { keyPath: 'className'});
                examsStore.createIndex('className', 'className', { unique: true });
                //examsStore.createIndex('examName', 'exam', { unique: false });
            }
            if (!db.objectStoreNames.contains('createdExams')) {
                const examsStore = db.createObjectStore('createdExams', { keyPath: 'className' });
                examsStore.createIndex('created', 'created', { unique: false });
                examsStore.createIndex('className', 'className', { unique: false });
                examsStore.createIndex('exam', 'exam', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('marks')) {
                const marksStore = db.createObjectStore('marks', { keyPath: 'adNumber' });
            
                marksStore.createIndex('class','class', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('attendance')) {
                const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attendanceStore.createIndex('date', 'date', { unique: false });
                attendanceStore.createIndex('studentId', 'studentId', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Add a single record
async function addRecord(storeName, data) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Add error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Add multiple records
async function addRecords(storeName, records) {
    console.log("recordsSaved success fully ", storeName);
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const requests = records.map(record => store.put(record));
            console.log("recordsSaved success fully ", storeName);
            Promise.all(requests.map(req => {
                return new Promise((res, rej) => {
                    req.onsuccess = res;
                    req.onerror = rej;
                });
                
            }))
            .then(() => resolve())
            .catch(error => reject("Batch add error: " + error));
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Get a single record by key
async function getRecord(storeName, key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Get error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Get all records (optionally filtered by index)
async function getAllRecords(storeName, indexName, query) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            let request;

            if (indexName) {
                const index = store.index(indexName);
                request = query ? index.getAll(query) : index.getAll();
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Get all error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Update a record
async function updateRecord(storeName, data) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Update error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Delete a record
async function deleteRecord(storeName, key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Delete error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Delete an entire object store
async function deleteStore(storeName) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            db.close(); // Need to close before version change
            
            const deleteRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);
            
            deleteRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName);
                }
            };
            
            deleteRequest.onsuccess = () => {
                db.close();
                resolve();
            };
            
            deleteRequest.onerror = (event) => reject("Delete store error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Delete the entire database
async function deleteDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject("Delete DB error: " + event.target.error);
        request.onblocked = () => reject("Delete DB blocked - close all connections first");
    });
}
//deleteDB();
async function deleteDatabase() {
  return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
          resolve(`Database "${DB_NAME}" deleted successfully.`);
      };

      request.onerror = (event) => {
          reject(`Error deleting database "${DB_NAME}": ${event.target.error}`);
      };

      request.onblocked = (event) => {
          reject(`Database "${DB_NAME}" delete blocked. Close other tabs/windows using this database.`);
      };
  });
}

//deleteDatabase();
// Clear all records from a store (without deleting the store)
async function clearStore(storeName) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Clear store error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Count records in a store
async function countRecords(storeName, indexName, query) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            let request;

            if (indexName && query) {
                const index = store.index(indexName);
                request = index.count(query);
            } else if (indexName) {
                const index = store.index(indexName);
                request = index.count();
            } else {
                request = store.count();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Count error: " + event.target.error);
        });
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }
}

// Helper function to get max marks for a subject in a class and exam
async function getMaxMarks(className, exam, subject) {
  try {
      const allMaxMarks = await getAllRecords('maxMarks');
      const classData = allMaxMarks.find(c => c.class === className);
      if (!classData) return null;

      const examData = classData.exams.find(e => e.exam === exam);
      if (!examData) return null;

      const subjectData = examData.subjects.find(s => s.subject === subject);
      return subjectData || null;
  } catch (error) {
      console.error("Error getting max marks:", error);
      return null;
  }
}

// 1. Get all students for a specific term
async function getTermExam(term) {
  try {
      const allStudents = await getAllRecords('marks');
      const result = allStudents.map(student => {
          const termExams = student.exams.filter(e => e.exam === term);
          return {
              adNumber: student.adNumber,
              name: student.name,
              class: student.class,
              exams: termExams
          };
      }).filter(student => student.exams.length > 0);

      return result;
  } catch (error) {
      console.error(`Error getting ${term} exams:`, error);
      throw error;
  }
}

// 2. Get all data for a specific subject
async function getSubjectwise(subject) {
  try {
      const allStudents = await getAllRecords('marks');
      const result = [];

      for (const student of allStudents) {
          for (const exam of student.exams) {
              const subjectResult = exam.subjects.find(s => s.subject === subject);
              if (subjectResult) {
                  const maxMarks = await getMaxMarks(student.class, exam.exam, subject);
                  result.push({
                      adNumber: student.adNumber,
                      name: student.name,
                      class: student.class,
                      exam: exam.exam,
                      subject: subjectResult.subject,
                      te: subjectResult.teMarks,
                      maxTe: maxMarks?.maxTe || 0,
                      ce: subjectResult.ceMarks,
                      maxCe: maxMarks?.maxCe || 0
                  });
              }
          }
      }

      return result;
  } catch (error) {
      console.error(`Error getting ${subject} data:`, error);
      throw error;
  }
}

// 3. Get a specific student's exams for a term
async function getStudentTermExam(studentId, term) {
  try {
      const student = await getRecord('marks', studentId);
      if (!student) throw new Error("Student not found");

      const termExams = student.exams.filter(e => e.exam === term);
      if (termExams.length === 0) throw new Error(`No ${term} exams found for this student`);

      // Enhance with max marks
      const enhancedExams = await Promise.all(termExams.map(async exam => {
          const enhancedSubjects = await Promise.all(exam.subjects.map(async subject => {
              const maxMarks = await getMaxMarks(student.class, exam.exam, subject.subject);
              return {
                  subject: subject.subject,
                  te: subject.teMarks,
                  maxTe: maxMarks?.maxTe || 0,
                  ce: subject.ceMarks,
                  maxCe: maxMarks?.maxCe || 0
              };
          }));
          return {
              exam: exam.exam,
              subjects: enhancedSubjects
          };
      }));

      return {
          adNumber: student.adNumber,
          name: student.name,
          class: student.class,
          exams: enhancedExams
      };
  } catch (error) {
      console.error(`Error getting ${term} exams for student ${studentId}:`, error);
      throw error;
  }
}

// 4. Get all students in a class for a specific term
async function getClasswiseExam(className, term) {
  try {
      const allStudents = await getAllRecords('marks');
      const classStudents = allStudents.filter(s => s.class === className);
      const result = [];

      for (const student of classStudents) {
          const termExams = student.exams.filter(e => e.exam === term);
          if (termExams.length > 0) {
              const enhancedExams = await Promise.all(termExams.map(async exam => {
                  const enhancedSubjects = await Promise.all(exam.subjects.map(async subject => {
                      const maxMarks = await getMaxMarks(className, term, subject.subject);
                      return {
                          subject: subject.subject,
                          te: subject.teMarks,
                          maxTe: maxMarks?.maxTe || 0,
                          ce: subject.ceMarks,
                          maxCe: maxMarks?.maxCe || 0
                      };
                  }));
                  return {
                      exam: exam.exam,
                      subjects: enhancedSubjects
                  };
              }));

              result.push({
                  adNumber: student.adNumber,
                  name: student.name,
                  class: student.class,
                  exams: enhancedExams
              });
          }
      }

      return result;
  } catch (error) {
      console.error(`Error getting ${term} exams for class ${className}:`, error);
      throw error;
  }
}

// 5. Get all students in a class for a specific subject
async function getClasswiseSubject(className, subject) {
  try {
      const allStudents = await getAllRecords('marks');
      const classStudents = allStudents.filter(s => s.class === className);
      const result = [];

      for (const student of classStudents) {
          const subjectResults = [];
          
          for (const exam of student.exams) {
              const subjectResult = exam.subjects.find(s => s.subject === subject);
              if (subjectResult) {
                  const maxMarks = await getMaxMarks(className, exam.exam, subject);
                  subjectResults.push({
                      exam: exam.exam,
                      te: subjectResult.teMarks,
                      maxTe: maxMarks?.maxTe || 0,
                      ce: subjectResult.ceMarks,
                      maxCe: maxMarks?.maxCe || 0
                  });
              }
          }

          if (subjectResults.length > 0) {
              result.push({
                  adNumber: student.adNumber,
                  name: student.name,
                  class: student.class,
                  subject: subject,
                  exams: subjectResults
              });
          }
      }

      return result;
  } catch (error) {
      console.error(`Error getting ${subject} data for class ${className}:`, error);
      throw error;
  }
}

// 6. Get specific subject data for a class in a specific term
async function getTermSubjectClasswise(className, term, subject) {
  try {
      const allStudents = await getAllRecords('marks');
      const classStudents = allStudents.filter(s => s.class === className);
      const result = [];

      for (const student of classStudents) {
          const termExam = student.exams.find(e => e.exam === term);
          if (termExam) {
              const subjectResult = termExam.subjects.find(s => s.subject === subject);
              if (subjectResult) {
                  const maxMarks = await getMaxMarks(className, term, subject);
                  result.push({
                      adNumber: student.adNumber,
                      name: student.name,
                      class: student.class,
                      exam: term,
                      subject: subject,
                      te: subjectResult.teMarks,
                      maxTe: maxMarks?.maxTe || 0,
                      ce: subjectResult.ceMarks,
                      maxCe: maxMarks?.maxCe || 0
                  });
              }
          }
      }

      if (result.length === 0) {
          throw new Error(`No data found for ${subject} in ${term} for class ${className}`);
      }

      return result;
  } catch (error) {
      console.error(`Error getting ${subject} data for ${term} in class ${className}:`, error);
      throw error;
  }
}

function clearAllRecords(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
  
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }
  

// Usage examples
//getAllRecords('maxMarks').then(console.log);
//getTermExam("Term I").then(console.log);
// getSubjectwise("Math").then(console.log);
// getStudentTermExam("101", "Term I").then(console.log);
 //getClasswiseExam("10 A", "Term I").then(console.log);
// getClasswiseSubject("10 A", "Math").then(console.log);
// getTermSubjectClasswise("10 A", "Term I", "Math").then(console.log);
const students= [
  { 
    adNumber: '101', 
    name: 'Alice Johnson', 
    class: '10 A', 
    exams: [
      {
        exam: 'Midterm',
        subjects: [
          { subject: 'Math', teMarks: 40.5, ceMarks: 20 },
          { subject: 'English', teMarks: 35, ceMarks: 25 },
          { subject: 'Biology', teMarks: 45, ceMarks: 30 }
        ]
      },
      {
        exam: 'Term I',
        subjects: [
          { subject: 'Math', teMarks: 38, ceMarks: 22 },
          { subject: 'English', teMarks: 30, ceMarks: 20 },
          { subject: 'Biology', teMarks: 42, ceMarks: 28 }
        ]
      }
    ]
  },
  { 
    adNumber: '102', 
    name: 'Bob Smith', 
    class: '10 A', 
    exams: [
      {
        exam: 'Midterm',
        subjects: [
          { subject: 'Math', teMarks: 32, ceMarks: 18 },
          { subject: 'English', teMarks: 28, ceMarks: 22 },
          { subject: 'Biology', teMarks: 38, ceMarks: 25 }
        ]
      },
      {
        exam: 'Term I',
        subjects: [
          { subject: 'Math', teMarks: 35, ceMarks: 20 },
          { subject: 'English', teMarks: 32, ceMarks: 18 },
          { subject: 'Biology', teMarks: 40, ceMarks: 22 }
        ]
      }
    ]
  },
  { 
    adNumber: '103', 
    name: 'Charlie Brown', 
    class: '10 B', 
    exams: [
      {
        exam: 'Midterm',
        subjects: [
          { subject: 'Math', teMarks: 45, ceMarks: 28 },
          { subject: 'English', teMarks: 38, ceMarks: 25 },
          { subject: 'Physics', teMarks: 42, ceMarks: 30 }
        ]
      },
      {
        exam: 'Term I',
        subjects: [
          { subject: 'Math', teMarks: 48, ceMarks: 25 },
          { subject: 'English', teMarks: 35, ceMarks: 22 },
          { subject: 'Physics', teMarks: 40, ceMarks: 28 }
        ]
      }
    ]
  }
  
];
const maxMarks =[
  {
    "class": "1 A",
    "exams": [
      {
        "exam": "Midterm",
        "subjects": [
          { "subject": "Math", "maxTe": 50, "maxCe": 30 },
          { "subject": "English", "maxTe": 50, "maxCe": 30 },
          { "subject": "Biology", "maxTe": 50, "maxCe": 30 }
        ]
      },
      {
        "exam": "Term I",
        "subjects": [
          { "subject": "ARABIC", "maxTe": 50, "maxCe": 30 },
          { "subject": "MALAYALAM", "maxTe": 50, "maxCe": 30 },
          { "subject": "ENGLISH", "maxTe": 50, "maxCe": 30 }
        ]
      }
    ]
  },
  {
    "class": "10 B",
    "exams": [
      {
        "exam": "Midterm",
        "subjects": [
          { "subject": "Math", "maxTe": 50, "maxCe": 30 },
          { "subject": "English", "maxTe": 50, "maxCe": 30 },
          { "subject": "Physics", "maxTe": 50, "maxCe": 30 }
        ]
      },
      {
        "exam": "Term I",
        "subjects": [
          { "subject": "Math", "maxTe": 50, "maxCe": 30 },
          { "subject": "English", "maxTe": 50, "maxCe": 30 },
          { "subject": "Physics", "maxTe": 50, "maxCe": 30 }
        ]
      }
    ]
  }
]
//deleteDatabase();
 //addRecords('maxMarks',maxMarks);
async function getStudentData() {
 //addRecords('marks',students);
 var datas = await getAllRecords('feeData');
 console.log("consoleddatas",datas);
}
getStudentData();
// export {
//     openDB,
//     addRecord,
//     addRecords,
//     getRecord,
//     getAllRecords,
//     updateRecord,
//     deleteRecord,
//     deleteStore,
//     deleteDB,
//     clearStore,
//     countRecords
// };

