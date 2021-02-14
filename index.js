import express from 'express';
import methodOverride from 'method-override'
import {add, read, write} from './jsonFileStorage.js'
import cookieParser from 'cookie-parser'
import moment from 'moment'
import session from 'express-session'

const app  = express();
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: false}))
app.use(methodOverride('_method'))
app.use(cookieParser())
app.use(session({secret:'secret', cookie:{sameSite:true}}))

//render form to allow user to create a sighting
app.get('/sighting', (req, res) => {
  res.render('form')
})

// holding page once user submits a new form
app.post('/sighting', (req, res) => {
  const content = req.body
  if (! moment(content.date_time, "DD-MM-YYYY HH:mm", true).isValid()) {
    res.redirect("/sighting")
  } else {
    add('data.json', 'sightings', content, ()=> {
    console.log('about to redirect')
    res.redirect("/")
    })
  }
})

//home page
app.get('/', (req, res) => {
  if (! req.session.visits) {
    req.session.visits = 1
  } else {
    req.session.visits += 1
  }
  const session = req.session
  const cookies = req.cookies
  const favIndexArray = [];
  const keyArray = Object.keys(cookies)
  for(let i =0; i < keyArray.length; i += 1) {
    if (keyArray[i].includes('favIndex')) {
      favIndexArray.push(parseInt(cookies[Object.keys(cookies)[i]]))
    }
  }
  read('data.json', (data)=> {
    const content = data.sightings
    const sortBy = req.query

    function compareDate(a,b) {
      let comparitor = 0;
      const dateA = moment(a.date_time, "DD-MM-YYYY HH:mm")
      const dateB = moment(b.date_time, "DD-MM-YYYY HH:mm")
      if (dateA > dateB){
        comparitor = 1
      } else {
        comparitor = -1
      }
      return comparitor;
    }

    //function to compare alphabetically
    function compare(a,b){
      const dataA = a.shape.toUpperCase();
      const dataB = b.shape.toUpperCase();
      let comparison = 0;
      if (dataA > dataB) {
        comparison = 1;
      } else if (dataA < dataB) {
        comparison = -1;
      }
      return comparison;
    }
    if(sortBy['sort-by'] === 'alphabetical') {
      content.sort(compare)
    } else if (sortBy['sort-by'] === 'date') {
      content.sort(compareDate)
    }
    content.forEach((element)=> {
      element.date_time = moment(element.date_time, "DD-MM-YYYY HH:mm").format("dddd, MMMM Do YYYY, HH:mm")
    })
    res.render('index', {content, sortBy, favIndexArray, session})
  })
})

// sighting page
app.get('/sighting/:index', (req, res) => {
  const {index} = req.params
  const cookies = req.cookies
  const favIndexArray = [];
  const keyArray = Object.keys(cookies)
  for(let i =0; i < keyArray.length; i += 1) {
    if (keyArray[i].includes('favIndex')) {
      favIndexArray.push(parseInt(cookies[Object.keys(cookies)[i]]))
    }
  }
  read('data.json', (data)=>{
    const content = data.sightings[index]
    res.render('sighting', {content, index, favIndexArray})
  })
})

//shape page
app.get('/shapes', (req, res) => {
  const shapeArray = []
  read('data.json', (data)=> {
    const content = data.sightings
    for(let i =0; i < data.sightings.length; i += 1) {
      if (! shapeArray.includes(data.sightings[i].shape)) {
        shapeArray.push(data.sightings[i].shape)
      } 
    }
    res.render('shapes', {content, shapeArray} )
  })
})

//form for user to edit specific sighting
app.get('/sighting/:index/edit', (req, res) => {
  const {index} = req.params;
  read('data.json', (data)=>{
    const content = data.sightings[index]
    res.render('edit', {content, index})
  })
})

// send cookies when user clicks heart icon
app.get('/favourite/:index', (req, res)=> {
  const {index} = req.params
  const currentCookies = req.cookies
  if (Object.keys(currentCookies).includes(`favIndex${index}`)) {
    res.clearCookie(`favIndex${index}`)
  } else {
    res.cookie(`favIndex${index}`, index)
  }
  res.redirect('/')
})

//update data based on user edits and render the sighting that was edited
app.put('/sighting/:index', (req, res)=> {
  const {index} = req.params
  read('data.json', (data)=> {
    const content = data.sightings[index]
      if (moment(req.body.date_time, "DD-MM-YYYY HH:mm", true).isValid()) {
        data.sightings[index] = req.body
        write('data.json', data, ()=> {
          console.log("successfully written")
          res.redirect(`/sighting/${index}`)
        })
    } else {
      // render same edit page with input pre-filled if date is invalid
      res.render(`edit`, {content, index})
    }
  })
}) 


app.delete('/sighting/:index', (req, res)=> {
  const {index} = req.params
  read('data.json', (data)=> {
    data.sightings.splice(index, 1)
    write('data.json', data, () => {
      console.log("Deleted successfully")
    })
  })
  res.redirect('/')
})

//start server
app.listen(3000, ()=> {
  console.log('listening on port 3000')
})