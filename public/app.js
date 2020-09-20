document.addEventListener('DOMContentLoaded', () => {
  const socket = io()
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1

  //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    },
  ]

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Select Player Mode
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Multiplayer
  function startMultiPlayer() {

    // Get your player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.innerHTML = "Lo sentimos, el servidor esta lleno"
      } else {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"

        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }
    })

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.style.display = 'none'
      }
    })

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i)
        if(p.ready) {
          playerReady(i)
          if(i !== playerReady) enemyReady = true
        }
      })
    })

    // On Timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'Has alcanzado el límite de 10 minutos'
    })

    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) playGameMulti(socket)
      else infoDisplay.innerHTML = "Por favor, coloque sus barcos"
    })

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if(currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          socket.emit('fire', shotFired)
        }
      })
    })

    // On Fire Received
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // On Fire Reply Received
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Single Player
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', () => {
      setupButtons.style.display = 'none'
      playGameSingle()
    })
  }

  //Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width*width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Draw the computers ships in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }
  

  //Rotate the ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      // console.log(isHorizontal)
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      // console.log(isHorizontal)
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  //move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))
  
 

  
  
  


  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    // console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    // console.log(shipLastId)
    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
    const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
    
    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex
    // console.log(shipLastId)

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
    //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
    //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
  }

  function dragEnd() {
    // console.log('dragend')
  }

  // Game Logic for MultiPlayer
  function playGameMulti(socket) {
    setupButtons.style.display = 'none'
    if(isGameOver) return
    if(!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if(currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Tu turno'
      }
      if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Turno del enemigo"
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Game Logic for Single Player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Tu turno'
      computerSquares.forEach(square => square.addEventListener('click', function(e) {
        shotFired = square.dataset.id
        revealSquare(square.classList)
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Turno computadora'
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
    if(gameMode === 'singlePlayer') playGameSingle()
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0


  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
      if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
      if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
      if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
      if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Partida Terminada'
  }

  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'Enemigo'
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `Hundistes el Destructor Del ${enemy}`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `Hundistes el Submarino Del  ${enemy} `
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `Hundistes el Crucero Del ${enemy}`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `Hundistes el Barco Del ${enemy}`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `Hundistes el Portador Del ${enemy} `
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `El ${enemy} Hundió su Destructor`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `El ${enemy} Hundió su Submarino`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `El ${enemy} Hundió su Crucero`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `El ${enemy} Hundió su Barco`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `El ${enemy} Hundió su portador`
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "Tu Ganastes"
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} Ganó`
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }

  

  const msgText = document.querySelector('#msg')
  const btnSend = document.querySelector('#btn-send')
  const chatBox = document.querySelector('.chat-content')
  const displayMsg = document.querySelector('.message')
  
  let name;
  do{
      name = prompt('¿Cuál es tu nombre?')
  }while(!name)

  
  document.querySelector('#your-name').textContent = "💎" + name
  msgText.focus()
  
  
  btnSend.addEventListener('click', (e)=>{
      e.preventDefault()
      sendMsg(msgText.value)
      msgText.value = '';
      msgText.focus();
      chatBox.scrollTop = chatBox.scrollHeight;
  })
  
  const sendMsg = message =>{
      let msg = {
          user: name,
          message: message.trim()
      }
  
      display(msg, 'you-message')
  
      socket.emit('sendMessage', msg)
  }

  socket.on('sendToAll', msg=>{
    display(msg, 'other-message')
    chatBox.scrollTop = chatBox.scrollHeight;
})
  
  const display = (msg, type) =>{
      const msgDiv = document.createElement('div')
      let className = type
      msgDiv.classList.add(className, 'message-row')
      let times = new Date().toLocaleTimeString()
  
      let innerText = `
      <div class="message-title">
      👥<span style="color: black">${msg.user}</span>
      </div>
      <div class="message-text">
          ${msg.message}
      </div>
      <div class="message-time">
          ${times}
      </div>
      `;
      msgDiv.innerHTML = innerText;
      displayMsg.appendChild(msgDiv)
  }

  

})






