class SudokuSolver {
    constructor(inputFields){
        this.sudokuCells = []
        inputFields.forEach((cell, i) => {
            this.sudokuCells[i] = new SudokuCell(cell.value, i)
        })
        
        this.templateCells = []
        let templateSize
        let startValues = []
        for(templateSize = 3; templateSize <= 5; templateSize++){
            this.templateCells[templateSize] = []
            this.generateTemplates(startValues, templateSize)
        }
    }

    generateTemplates(startValues, templateSize){
        ["1","2","3","4","5","6","7","8","9"].forEach(value => {
            if (startValues.length == 0 || value > startValues[startValues.length - 1]){
                startValues.push(value)
                if(startValues.length == templateSize){
                    this.templateCells[templateSize].push(new SudokuCell("",0,true,startValues))
                    startValues.pop()
                } else{
                    this.generateTemplates(startValues,templateSize)
                    startValues.pop()
                }
            }
        })
    }

    compute(){
        let i
        for(i = 0; i < 1000 && !this.isSolved(); i++){
            let currentCells = []
            let invertedData = new InvertedData(this.sudokuCells)
            let invertedDataArray = [] //Array of invertedDataNumber to compare for corresponding locations
            let compareCount
            let compareMax = 5 - (i % 5) 
            for(compareCount = 1; compareCount <= compareMax; compareCount++){
                let template = (i % 100 == 99) && compareCount > 2// Run in template mode every 100 iterations 
                this.multiCellCompare(currentCells, compareCount, template)
                invertedData.rows.forEach(row => {
                    invertedData.multiNumberCompare(invertedDataArray, row, compareCount)
                })
                invertedData.columns.forEach(column => {
                    invertedData.multiNumberCompare(invertedDataArray, column, compareCount)
                })
                invertedData.boxes.forEach(box => {
                    invertedData.multiNumberCompare(invertedDataArray, box, compareCount)
                })
            }
        }
    }

    multiCellCompare(currentCells, compareCount, template){
        if(template == true && currentCells.length == 0){
            this.templateCells[compareCount].forEach(templateCell => {
                currentCells.push(templateCell)
                this.multiCellCompare(currentCells, compareCount, template)
                currentCells.pop()
            })
        }
        this.sudokuCells.forEach(sudokuCell => {
            if (sudokuCell.values.length <= compareCount){
                let compareBoolean = (currentCells.length == 0 ||
                    !currentCells.includes(sudokuCell) &&
                    sudokuCell.valuesCompare(currentCells[0]) && 
                    this.locationMatchAll(currentCells.concat([sudokuCell])))
                if (compareBoolean){
                    currentCells.push(sudokuCell)
                    if(currentCells.length == compareCount + template){
                        this.multiTrim(currentCells)
                        currentCells.pop()
                    } else {
                        this.multiCellCompare(currentCells, compareCount, template)
                        currentCells.pop()
                    }
                }
            }
        })
    }

    locationMatchAll(currentCells){
        return currentCells.every((sudokuCell, i) => {
            return currentCells.every((otherCell, j) =>{
                return i===j || sudokuCell.locationMatch(otherCell)
            })
        })
    }

    multiTrim(currentCells) {
        this.sudokuCells.forEach(otherCell => {
            if (this.locationMatchAll(currentCells.concat(otherCell))){
                otherCell.trim(currentCells[0].values)
            }
        })
    }

    isSolved(){
        return this.sudokuCells.every(sudokuCell => {
            return sudokuCell.value != ""
        })
    }

    updateDisplay() {
        this.sudokuCells.forEach(sudokuCell => {
            inputFields[sudokuCell.cellIndex].value = sudokuCell.value
        })
    }
}

const solveButton = document.querySelector('[solve]')
const resetButton = document.querySelector('[reset]')
const inputFields = document.querySelectorAll('[cell]')

solveButton.addEventListener('click', button => {
    const sudokuSolver = new SudokuSolver(inputFields)
    sudokuSolver.compute()
    sudokuSolver.updateDisplay()
})

resetButton.addEventListener('click', button => {
    inputFields.forEach(cell => {
        cell.value = ""
    })
})

inputFields.forEach(cell => {
    cell.addEventListener('change', () => {
        if (isNaN(cell.value) || cell.value == 0) {
            cell.value = ""
        }
    })
})

class SudokuCell {
    constructor(cellValue, cellIndex, template = false, startValues){
        this.template = template
        this.value = cellValue 
        this.row = Math.floor(cellIndex / 27) * 3 + Math.floor((cellIndex % 9) / 3)
        this.column = Math.floor((cellIndex % 27) / 9) * 3 + (cellIndex % 3)
        this.box = Math.floor(cellIndex / 9)
        this.cellIndex = cellIndex
        if (cellValue == ""){
            this.values = ["1","2","3","4","5","6","7","8","9"]
        } else {
            this.values = [cellValue]
        }
        if (startValues !== undefined){
            this.values = startValues.slice()
        }
    }

    locationMatch(otherCell){
        if (this!==otherCell){
            let matchBoolean = this.row == otherCell.row || 
            this.column == otherCell.column || 
            this.box == otherCell.box ||
            this.template == true ||
            otherCell.template == true //Templates should match location with all cells
            if(matchBoolean){
                return true
            }
        }
        return false
    }

    valuesCompare(otherCell){
        return this.values.every(element => {
            return otherCell.values.includes(element)
        })
    }

    keep(keepArray){
        this.values = this.values.filter(element => keepArray.includes(element))
        this.updateValue()
    }

    trim(trimArray){
        this.values = this.values.filter(element => !trimArray.includes(element))
        this.updateValue()
    }

    updateValue(){
        if (this.values.length == 1) {
            this.value = this.values[0]
        }
    }
}

class InvertedData{
    constructor(sudokuCells, template = false){
        //Inserts cells arrays based on the values they contain
        this.template = template
        let i
        this.rows = []
        this.columns = []
        this.boxes = []
        for(i=0; i<9; i++){
            this.rows[i] = []
            this.columns[i] = []
            this.boxes[i] = []
        }
        sudokuCells.forEach(sudokuCell => {
            sudokuCell.values.forEach(cellValue => {
                let foundNumberRows = this.rows[sudokuCell.row].find(a=>a.number == cellValue)
                if(foundNumberRows != undefined){
                    foundNumberRows.addLocation(sudokuCell)
                } else {
                    this.rows[sudokuCell.row].push(new InvertedDataNumber(cellValue, sudokuCell))
                }
                let foundNumberColumns = this.columns[sudokuCell.column].find(a=>a.number == cellValue)
                if(foundNumberColumns != undefined){
                    foundNumberColumns.addLocation(sudokuCell)
                } else {
                    this.columns[sudokuCell.column].push(new InvertedDataNumber(cellValue, sudokuCell))
                }
                let foundNumberBoxes = this.boxes[sudokuCell.box].find(a=>a.number == cellValue)
                if(foundNumberBoxes != undefined){
                    foundNumberBoxes.addLocation(sudokuCell)
                } else {
                    this.boxes[sudokuCell.box].push(new InvertedDataNumber(cellValue, sudokuCell))
                }
            })
        })
        for(i=0; i<9; i++){
            this.rows[i].sort((a,b) => a.number - b.number)
            this.columns[i].sort((a,b) => a.number - b.number)
            this.boxes[i].sort((a,b) => a.number - b.number)
        }
    }

    multiNumberCompare(invertedDataArray, group, compareCount){
        group.some(invertedDataNumber => {
            if (invertedDataNumber.locations.length <= compareCount){
                let compareBoolean = (invertedDataArray.length == 0 || 
                    !invertedDataArray.includes(invertedDataNumber) &&
                    this.locationsCompare(invertedDataNumber, invertedDataArray[0]))
                if (compareBoolean){
                    invertedDataArray.push(invertedDataNumber)
                    if(invertedDataArray.length == compareCount){
                        let keepArray = Array.from(invertedDataArray, (a => a.number))
                        invertedDataNumber.keep(keepArray)
                        invertedDataArray.pop()
                        if(invertedDataArray.length > 0){
                            return true
                        }
                    } else {
                        this.multiNumberCompare(invertedDataArray, group, compareCount)
                        invertedDataArray.pop()
                    }
                }
            }
        })
    }
            
    locationsCompare(invertedDataNumber, otherDataNumber){
        if (invertedDataNumber !== otherDataNumber){
            return invertedDataNumber.locations.every(element => {
                return otherDataNumber.locations.includes(element)
            })
        }
    }
    
}

class InvertedDataNumber{
    constructor(number, location){
        this.number = number
        this.locations = [] //Stores pointers to SudokuCell objects
        this.locations[0] = location
    }
    addLocation(location){
        this.locations.push(location)
    }
    keep(keepArray){
        this.locations.forEach(sudokuCell => {
            sudokuCell.keep(keepArray)
            sudokuCell.updateValue()
        })
    }
}