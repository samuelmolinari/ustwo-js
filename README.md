# Real-time Tic-Tac-Toe
===
# Namespace

Every classes on the client side are within the ``ustwo`` namespace to avoid naming
conflict with future/existing libraries.

# Models

## GameSession

A game session is a representation of the current game happening in real-time.

### Data Binding

It binds data needed to be updated in real-time via sessions:

- ``player`` Keeps track on who's player the current user represents (can be ``x`` or ``o``)

- ``rival`` The opposite of player

- ``isPlayerTurn`` Updates itself when the it is the turn of the current user to play (``true``), or waiting for their turn (``false``)

- ``isPending`` Returns is ``true`` when only one player has joined the game. As soon as a second player has joined, the session returns ``false``

- ``grid`` A generated data structure based on the current game grid. It changes everytime a player make their move on the grid.

- ``winner`` Returns ``null`` when no player has won, or when a player has won, it returns ``x`` or ``o``depending on who is the winner.

- ``gameId`` Save the id of the current game

### Session

A new game is created the following way (WARNING: it's bad, really)

When a user starts a session, the ``find`` method is executed. It's aim is to find
an existing game to join. If there are no existing game, a new game is created
and is pending until a second user joins in.

When a user join an existing game, it is done via a method on the server side.
If that happened on the client side, there are some cases where 2 user could possibly
join the same game at the same time.

Once a game session is over, the current session is cleared out and both user have their
``find`` methods executed, but with a random delay so they are unlikely to
create new games at the same time, increasing the chances to make them play against each other
if they are the only active players on the platform.

#### Issues

- Someone could start a session, then leave. This would leave a pending game and the next user would join a not-so-exciting game without any opponent.

- There is still a chance that both players start a new game at the same time. This could mean they could be both waiting for another user to play with, when they could actually be playing against each other.

  SOLUTION:

  - Create a queue system. No game would be created until there are at least 2 users at the head of the queue. These 2 players would then be added to a new game automatically.
  - Once the game is over, the user is sent back at the end of the queue
  - Game sessions should track the time it takes for a player to play. If the player has been inactive for over ``n`` seconds, make a message appear on the screen to let both users they can leave this game and join a new one.

### Play

A user can only play when it meets the following conditions:

- When the gameplay is not pending
- When it is the player's turn to play
- When there are no winners yet

If a user meets these conditions, they can click on the cell they want to place their token on.
It will add the player to the grid data structure and save it to the database.

Once the cell has been clicked, the current user instantly loses their turn by updating the ``isPlayerTurn`` session locally, then confirmed remotely.

#### Issues

- The whole logic is on the client side, this is terrible (or fun, depends if you are a developer or not)A lot of the logic should be implemented on the server side.

  ie: Wait for your opponent to play their turn. Now, open the console, select the cell they have played, and remove the ``data-player`` attribute. You can now play your turn on the same cell.

  You are thinking "Why on earth did that dude implement it that way?". As any great teacher, my answer would be "because I want to make sure you are actually reading the doc".

  So if you decide to play with your colleague, you can make them go insane. Thank me later.

- If a user play their turn, and the query is not registered property in the backend, the gameplay will freeze (both player will end up with a ``isPlayerTurn`` session that returns false)
