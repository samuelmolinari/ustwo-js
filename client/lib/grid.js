/** @namespace **/
ustwo = window.ustwo || {};

/**
 * Represents a grid structure
 * @constructor
 * @param {array} Grid content
 */
ustwo.Grid = function(arr) {
  var _this = this;

  function init() {
    _this.store = arr || new Array(9);
    _this.winner = null;
    _this.winningCells = null;

    if(arr) {
      _this.retrieveWinner();
    }
  }

  init();
};

ustwo.Grid.COLUMNS = 3;
ustwo.Grid.ROWS = 3;

/**
 * Set a value in the grid
 * @param {number} row the row number
 * @param {number} column the column number
 * @param {object} value the value to be stored
 */
ustwo.Grid.prototype.set = function(row,column,value) {
  this.store[row * ustwo.Grid.COLUMNS + column] = value;
  this.retrieveWinner();
}

/**
 * Check if the grid has a winner
 * @return {boolean}
 */
ustwo.Grid.prototype.hasWinner = function() {
  return this.winner != null;
}

/**
 * Check if all the cells are taken
 * @return {boolean}
 */
ustwo.Grid.prototype.isFull = function() {
  for(var i=0;i<this.store.length;i++) {
    if(!this.store[i]) return false;
  }
  return true;
}

/**
 * Get the array representing the grid
 * @return {array}
 */
ustwo.Grid.prototype.getStore = function() {
  return this.store;
};

/**
 * Get set of indexes representing the given row
 * @param {number} n the row number
 * @return {array} an array of indexes
 */
ustwo.Grid.getRowIndexes = function(n) {
  var rowIndexes = []; // Initialise the array that will contain the indexes
  var rowStartAt = n * ustwo.Grid.COLUMNS; // Compute at what index row n starts

  // Go through each columns within that row
  for(var columnIndex = 0; columnIndex < ustwo.Grid.COLUMNS; columnIndex++) {
    // Compute the cell index (add column number to row starting index
    rowIndexes[columnIndex] = rowStartAt + columnIndex;
  }
  return rowIndexes;
};

/**
 * Get set of indexes representing the given column
 * @param {number} n the column number
 * @return {array} an array of indexes
 */
ustwo.Grid.getColumnIndexes = function(n) {
  var columnIndexes = []; // Initialise the array that will contain the indexes

  // Go through each row within that column
  for(var rowIndex = 0; rowIndex < ustwo.Grid.ROWS; rowIndex++) {
    var rowStartAt = rowIndex * ustwo.Grid.COLUMNS; // Compute at what index the row starts
    columnIndexes[rowIndex] = rowStartAt + n; // Add the column number to the starting row index
  }
  return columnIndexes;
};

/**
 * Get set of indexes representing the first diagonal (top left -> bottom right)
 * @return {array} an array of indexes
 */
ustwo.Grid.getFirstDiagonalIndexes = function() {
  return ustwo.Grid.getDiagonalIndexes(0, 1);
};

/**
 * Get set of indexes representing the first diagonal (top right -> bottom left)
 * @return {array} an array of indexes
 */
ustwo.Grid.getSecondDiagonalIndexes = function() {
  return ustwo.Grid.getDiagonalIndexes(ustwo.Grid.ROWS - 1, -1);
};

/**
 * Get a diagonal depending on the given paramters
 * @param {number} startAt the index to start with
 * @param {number} sign the sign use to change the column number (+1 or -1)
 */
ustwo.Grid.getDiagonalIndexes = function(startAt,sign) {
  var diagonal = [];
  var columnIndex = startAt;

  // Fetch diagonal indexes row by row
  for(var rowIndex = 0; rowIndex < ustwo.Grid.ROWS; rowIndex++) {
    var rowStartAt = rowIndex * ustwo.Grid.COLUMNS; // Compute the index the row starts
    diagonal[rowIndex] = rowStartAt + columnIndex; // Add the column index to it
    columnIndex += sign; // Increment or decrement column index depending on the given sign
  }

  return diagonal;
};

/**
 * Check if a line contains all the same value
 * @param {array} line a set indexes representing a line
 * @return {boolean}
 */
ustwo.Grid.prototype.checkWinningLine = function(line) {
  var tag = null;

  // Go through each index of that line
  for(var i=0;i<line.length;i++) {
    var value = this.store[line[i]]; // Retrieve the value stored at the index

    if(!value) return false; // If there are no set value then the line isn't complete and can't be a winning line

    if(tag === null) {
      tag = value; // Set the line tag every other values on that line should match to
    } else if(tag !== value) {
      return false; // Return false when the value doesn't match the line's tag
    }
  }

  return true;
};

/**
 * Check multiple line of same type with its matching function
 * @param {number} length the number of line of the same type
 * @param {function} fn function to be called to retrieve a type of line
 */
ustwo.Grid.prototype.checkWinningLineOfType = function(length, fn) {
  for(var i=0;i<length;i++) {
    var line = fn(i);
    if(this.checkWinningLine(line)) return line;
  }
  return null;
}

/**
 * Find the winner and matching winning line within the grid
 * @return {array} set of indexes representing the winning line
 */
ustwo.Grid.prototype.retrieveWinner = function() {

  // Check all possible lines for a winner
  var winningLine = this.checkWinningLineOfType(1,
                                      ustwo.Grid.getFirstDiagonalIndexes);
  if(!winningLine) winningLine = this.checkWinningLineOfType(1,
                                      ustwo.Grid.getSecondDiagonalIndexes);
  if(!winningLine) winningLine = this.checkWinningLineOfType(ustwo.Grid.ROWS,
                                      ustwo.Grid.getRowIndexes);
  if(!winningLine) winningLine = this.checkWinningLineOfType(ustwo.Grid.COLUMNS,
                                      ustwo.Grid.getColumnIndexes);

  // When a winning line is found, set the winner of that line, and store
  // the winning cell indexes
  if(winningLine) {
    this.winner = this.store[winningLine[0]];
    this.winningCells = {};
    for(var i=0;i<winningLine.length;i++) {
      this.winningCells[winningLine[i]] = true;
    }
  }

  return winningLine;
}

/**
 * Convert the grid into a data structure readable by the template engine
 * @return {object} the new data structure representing the grid
 */
ustwo.Grid.prototype.toTemplateObject = function() {
  var grid = [];

  for(var i=0;i < (ustwo.Grid.COLUMNS * ustwo.Grid.ROWS);i++) {
          // Compute the row and column number of the current cell
          var rowNumber = Math.floor(i / ustwo.Grid.COLUMNS);
          var columnNumber = i % ustwo.Grid.COLUMNS;

          // Create or re-use the data structure for the current row
          var row = grid[rowNumber] || { index: rowNumber, content: [] };

          // Build and add cell metadata to the structure
          row.content[columnNumber] = { index: columnNumber,
                                        win: this.hasWinner() &&
                                             this.winningCells[i],
                                        content: this.store[i] };
          grid[rowNumber] = row;
        }

  return grid;
};
