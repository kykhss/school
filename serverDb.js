
let UserMail = localStorage.getItem('loggedIn')||"";
//const userMailfor = JSON.parse(UserMail);
const className2 ="1 A";
async function createdExams(UserMail,className,type) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'createdExams',
                myUserMail: UserMail,
                myclassName: className,
                institution:'School' 
            })
        });
       // const response = await fetch(`https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec? action =scoreData & myUserMail= ${UserMail} & myclassName= ${className} & institution = School`);

console.log('usermail:'+UserMail)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    

        const result = await response.json();
        console.log('newresults');
        console.log(result);
      // await deleteStore('marks');
      if(type&&type==='new'){
        clearandRecord('createdExams',result)
      }else{
        await addRecords('createdExams', result);
      }
       // addrecord('maxMarks', result.maxMarks);
    } catch (error) {
        console.error('Error loading report:', error);
        // You might want to add some user-facing error handling here
    }
}

async function fetchFeeData(userMail, className, type) {
    const url = 'https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec';
  
    try {
      console.log('Fetching fee data for:', userMail, 'Class:', className);
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'getFeeBalance',
          myUserMail: userMail,
          myclassName: className,
          institution: 'School'
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('Fetched Fee Data:', result);
  
      // Save or overwrite data based on 'type'
      if (type === 'new') {
        clearandRecord('feeData', result); // overwrites
      } else {
        await addRecords('feeData', result); // adds to existing
      }
      await addRecords('feeData', result); // adds to existing
    } catch (error) {
      console.error('Error loading fee data:', error.message || error);
      alert('Failed to load data. Please try again later.');
    }
  }

 //fetchFeeData("userMail","1 A","new");

 async function loadAdmissionTable (curruntyear,time=null) {
  // const spinner = document.getElementById('pload');
  // spinner.style.display = 'block';

  // Get the current year from the input
  //const curruntyear =""// document.getElementById("curruntyear").value;
  
  
 await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudents&curruntyear=${curruntyear}&stuIds=${"" || ""}&lastTime=${""}`)
      .then(response => response.json())
      .then(data => {
          if (data.students && data.students.length > 0) {
              const studentsData = data.students;
              const heads = data.headers;
              console.log(data);
              console.log("updatedvies");
              localStorage.setItem('stuHeads', JSON.stringify(heads));
              console.log(heads);
              const timestamp = Date.now();
              try {
               addRecords('adStudents',studentsData);
} catch (error) { // Changed 'catch.error' to 'catch (error)'
  console.log("Error storing students:", error); // It's good practice to log the error object
}
          } else {
              //showSuccessMessage("no New Data");
              //document.getElementById('studentTableContainer').innerHTML = '<p>No students found</p>';
          }
      })
      .catch(error => console.error('Error fetching student data:', error))
      .finally(() => {
         // hideLoader();
          //spinner.style.display = 'none';
      });
}

async function getClassSubjectMap(UserMail,Type='update',time){
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'getClassSubjectMap',
            myUserMail: UserMail,
            type:Type,
            lastTime:time||"",
            //myclassName: className,
            institution:'School' 
        })
    });
   // const response = await fetch(`https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec? action =scoreData & myUserMail= ${UserMail} & myclassName= ${className} & institution = School`);

console.log('usermail:'+UserMail)
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }


    const result = await response.json();
    console.log('resultclasssubject');
    console.log(result.subjectmap);

  //await deleteStore('subjectCombo');
  if(Type==='new'){
   //await clearandRecord('subjectCombo',result.subjectmap);
  }

    await addRecords('subjectCombo', result.subjectmap);

   // addrecord('maxMarks', result.maxMarks);
} catch (error) {
    console.error('Error loading report:', error);
    // You might want to add some user-facing error handling here
}
}

async function getMarks(UserMail,className,Type) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'scoreData',
                myUserMail: UserMail,
                myclassName: className||"1 A",
                institution:'School' 
            })
        });
       // const response = await fetch(`https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec? action =scoreData & myUserMail= ${UserMail} & myclassName= ${className} & institution = School`);

console.log('usermail:'+UserMail)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    

        const result = await response.json();
        console.log('exam marks new');
        console.log(result);
      // await deleteStore('marks');
      if(Type==='new'){
        clearandRecord('marks',result)
      }else{
        await addRecords('marks', result);
      }
       // addrecord('maxMarks', result.maxMarks);
    } catch (error) {
        console.error('Error loading report:', error);
        // You might want to add some user-facing error handling here
    }
}
async function getStudents(className,Type) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'getStudentsByClass',
               // myUserMail: UserMail,
                myclassName: className,
                institution:'School' 
            })
        });
       // const response = await fetch(`https://script.google.com/macros/s/AKfycbwI7-WkTLWQeTDzgyBlPio3o1ivUmfhHmhI7l60RXX7vPf1pnM2BaKRhIHu4QfF3mbz/exec? action =scoreData & myUserMail= ${UserMail} & myclassName= ${className} & institution = School`);

console.log('usermail:'+UserMail)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    

        const result = await response.json();
        console.log('getStudentsByClass new');
        console.log(result);
      // await deleteStore('marks');
      if(Type==='new'){
        clearandRecord('students',result)
      }else{
        await addRecords('students', result);
      }
       // addrecord('maxMarks', result.maxMarks);
    } catch (error) {
        console.error('Error loading report:', error);
        // You might want to add some user-facing error handling here
    }
}


async function clearandRecord(store="subjectCombo",result){
   await clearStore(store);
  await addRecords(store, result);
}

async function getMaxMarks(selectedClass=null) {
    if(!selectedClass||selectedClass===null){
        let data = await getAllRecords('createdExams');
        const maxMarks = data.flatMap(element =>
            element.exams.map(exam => ({
              className: element.className,
              subject: exam.subject,
              exam: exam.exam,
              maxTE: exam.maxTE,
              maxCE: exam.maxCE,
              createdBy: exam.createdBy,
              isenable: exam.isenable
            }))
          );
          return maxMarks
          
            }else{
    const data = await getAllRecords('createdExams','className',selectedClass);
    const found = data.flatMap(element =>
        element.exams.map(exam => ({
          className: element.className,
          subject: exam.subject,
          exam: exam.exam,
          maxTE: exam.maxTE,
          maxCE: exam.maxCE,
          createdBy: exam.createdBy,
          isenable: exam.isenable
        }))
      );
      return found
      
        }}
  
        async function getexamScores(myclass = null, examName = null, subjectName = null) {
          try {
              const marks = await getAllRecords('marks'); // Assuming it returns an array
      
              // Filter data by class
              const classMarks = marks.filter(record => record.className === myclass);
      
              const result = [];
      
              classMarks.forEach(record => {
                  if (Array.isArray(record.exams)) {
                      record.exams.forEach(exam => {
                          // Match exam name if given
                          if (!examName || exam.exam === examName) {
                              if (exam.subjects && typeof exam.subjects === 'object') {
                                  const subjects = Object.entries(exam.subjects);
      
                                  subjects.forEach(([subj, data]) => {
                                      if (!subjectName || subj === subjectName) {
                                          result.push({
                                              className: record.className,
                                              exam: exam.exam,
                                              subject: subj,
                                              teMarks: data.teMarks ?? null,
                                              ceMarks: data.ceMarks ?? null,
                                              studentId: record.studentId ?? null,
                                          });
                                      }
                                  });
                              }
                          }
                      });
                  }
              });
      
              return result;
      
          } catch (error) {
              console.error("Failed to get exam scores:", error);
              throw error;
          }
      }


      async function get(data) {
        let timestamp = getsync(data.storeName);
        console.log("getdataas",data.storeName);
        try {
          const records = await getAllRecords(data.storeName, data.indexName, data.query);
          //console.log("fromget",records);
          if (!records||records.length===0||(data.timestamp && data.timestamp!=="" && timestamp.time!==data.timestamp)) {
            
            if (data.storeName === "marks") {
              await getMarks(data.userMail, data.className);
            } else if (data.storeName === "students") {
              await getStudents(data.className);
              console.log("getstudents is now running");
            }else if (data.storeName === "adStudents") {
              await loadAdmissionTable(data.curYear,timestamp.time);
              console.log("getstudents is now running");
            } else if (data.storeName === "Allstudents") {
              await loadAdmissionTable(timestamp.time);
              console.log("getstudents is now running");
            }else if (data.storeName === "feeData") {
              await fetchFeeData(data.userMail, data.className);
            }
          }

          const records2 = await getAllRecords(data.storeName, data.indexName, data.query);
            return records2;

        } catch (error) {
          console.error("Failed to get exam scores:", error);
          throw error;
        }
      }
      

      async function getsync(storeName){
          var dat = await getRecord("syncMetadata",storeName);
          return dat;
      }

      async function setsync(storeName){
        const now = Date.now();
        var dat = {"id":storeName,"time":now}
        return  await updateRecord("syncMetadata",dat);
         
    }

      



      async function doit() {
        const gets = await get("");
        console.log(gets);
      }


      //doit();
      //getMarks(UserMail="office@gmail.com",'1 A');
      const conmark = getexamScores('1 A');
      console.log(conmark)

      createdExams(UserMail,className="1 A","new");


      // getClassSubjectMap(myUserMail="office@gmail.com","new");
     
