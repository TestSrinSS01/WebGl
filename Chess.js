class Chess {
    static is_uppercase = char => char >= 'A' && char <= 'Z'
    constructor(fen, turn, castle, en_passant) {
        this.path = []
        this.turn = turn
        this.castle = castle
        this.en_passant = this.cellToIndex(en_passant)
        this.board = []
        this.offsets = [8, -8, 1, -1, 7, -7, 9, -9]
        this.knight_offsets = [ [ 2, -1 ], [ -2, 1 ], [ -1, -2 ], [ 1, 2 ], [ 2, 1 ], [ -2, -1 ], [ 1, -2 ], [ -1, 2 ] ]
        this.king_offsets = [ [ 1, 0 ], [ -1, 0 ], [ 0, -1 ], [ 0, 1 ], [ 1, -1 ], [ -1, 1 ], [ 1, 1 ], [ -1, -1 ] ]
        this.numberOfSquaresToEdgeCache = []
        let file = 0, rank = 7
        for (const it of fen) {
            if (it === '/') {
                rank--;
                file = 0;
            } else if (!isNaN(it)) {
                file += it.charCodeAt(0) - '0'.charCodeAt(0);
            } else {
                this.board[rank * 8 + file] = it;
                file++
            }
        }
        for (let i = 0; i < 64; i++) {
            const r = i >>> 3;
            const f = i & 7;
            const north = 7 - r;
            const east = 7 - f;
            this.numberOfSquaresToEdgeCache[i] = [
                north, r, east, f, Math.min(north, f), Math.min(r, east), Math.min(north, east), Math.min(r, f)
            ]
        }
    }
    cellToIndex(cell) {
        if (cell === '-') return -1
        const rank = cell.charCodeAt(1) - '0'.charCodeAt(0) - 1;
        const file = cell.charCodeAt(0) - 'a'.charCodeAt(0);
        return rank * 8 + file;
    }
    isSlidingPiece(piece) {
        piece = piece.toUpperCase();
        return piece === 'R' || piece === 'B' || piece === 'Q';
    }
    is_friendly_piece(piece1, piece2) {
        return (piece1 !== 'd' && piece2 !== 'd')
            && (!Chess.is_uppercase(piece1) && !Chess.is_uppercase(piece2)) || (Chess.is_uppercase(piece1) && Chess.is_uppercase(piece2));
    }
    get fen() {
        let fen = '';
        for (let i = 7; i >= 0; --i) {
            let blank = 0;
            for (let j = 0; j < 8; ++j) {
                const piece = this.board[i * 8 + j];
                if (piece) {
                    if (blank !== 0) fen += (blank);
                    fen += (piece);
                    blank = 0;
                } else if (j + 1 === 8 && blank !== 0)
                    fen += (blank + 1);
                else blank++;
            } fen += (i === 0? " ": "/");
        } fen += this.turn + " - "
        if (this.en_passant > 0) {
            const rank = this.en_passant >>> 3;
            const file = this.en_passant & 7;
            fen += String.fromCharCode('a'.charCodeAt(0) + file) + String.fromCharCode('1'.charCodeAt(0) + rank)
        } else fen += ("-");
        return fen;
    }
    get_pawn_piece_moves(cell, piece) {
        let moves = []
        let rank = cell >>> 3;
        const directions = piece === 'P'? [4, 6]: [5, 7] // [ piece === 'P'? 4: 5, piece === 'P'? 6: 7 ]
        const n = (piece === 'p' && 7 - rank === 1) || (piece === 'P' && rank === 1)? 2: 1
        for (let i = 1; i <= n; ++i) {
            const target_cell = cell + this.offsets[piece === 'P'? 0: 1] * i;
            if (this.board[target_cell]) break;
            moves = moves.concat(target_cell);
        }
        for (let direction of directions) {
            const target_cell = cell + this.offsets[direction];
            const piece_at_target_cell = this.board[target_cell];
            if ((piece_at_target_cell && !this.is_friendly_piece(piece, piece_at_target_cell)) || target_cell === this.en_passant)
                moves = moves.concat(target_cell | 64);
        }
        return moves;
    }
    get_non_sliding_piece_moves(cell, piece) {
        let moves = []
        const rank = cell >>> 3;
        const file = cell & 7;
        const is_knight = piece === 'n' || piece === 'N';
        for (let direction = 0; direction < 8; ++direction) {
            let target_cell;
            const offset = is_knight? this.knight_offsets[direction]: this.king_offsets[direction];
            const r = rank + offset[0];
            const f = file + offset[1];
            if (r < 0 || r > 7 || f < 0 || f > 7) continue;
            target_cell = r * 8 + f;
            const piece_at_target_cell = this.board[target_cell];
            if (piece_at_target_cell && this.is_friendly_piece(piece, piece_at_target_cell)) continue;
            if (piece_at_target_cell && !this.is_friendly_piece(piece, piece_at_target_cell)) {
                moves = moves.concat(target_cell | 64);
                continue;
            }
            moves = moves.concat(target_cell);
        }
        return moves;
    }
    get_sliding_piece_moves(cell, piece) {
        const start_direction_index = piece === 'b' || piece === 'B'? 4: 0;
        const end_direction_index = piece === 'r' || piece === 'R'? 4: 8;
        let moves = []
        for (let direction = start_direction_index; direction < end_direction_index; ++direction) {
            for (let number_of_squares = 0; number_of_squares < this.numberOfSquaresToEdgeCache[cell][direction]; ++number_of_squares) {
                const target_cell = cell + this.offsets[direction] * (number_of_squares + 1);
                const piece_at_target_cell = this.board[target_cell];
                if (piece_at_target_cell && this.is_friendly_piece(piece, piece_at_target_cell)) break;
                else if (piece_at_target_cell && !this.is_friendly_piece(piece, piece_at_target_cell)) {
                    moves = moves.concat(target_cell | 64);
                    break;
                }
                else moves = moves.concat(target_cell);
            }
        }
        return moves;
    }
    show(player, start_index) {
        let moves = [];
        if (player !== this.turn) return moves;
        const start_piece = this.board[start_index];
        if ((this.turn === 'w' && !Chess.is_uppercase(start_piece)) || (this.turn === 'b' && Chess.is_uppercase(start_piece))) return moves;
        if (!start_piece) return moves;
        if (this.isSlidingPiece(start_piece)) {
            moves = this.get_sliding_piece_moves(start_index, start_piece);
        } else if (start_piece === 'p' || start_piece === 'P') {
            moves = this.get_pawn_piece_moves(start_index, start_piece);
        } else {
            moves = this.get_non_sliding_piece_moves(start_index, start_piece);
        }
        this.path = []
        this.path = this.path.concat(moves);
        return moves;
    }
    move(start_index, end_index) {
        const moves = this.path
        this.path = [];
        if (moves.length === 0) return false;
        const start_piece = this.board[start_index];
        const end_piece = this.board[end_index];
        if (end_piece && this.is_friendly_piece(start_piece, end_piece)) return false;
        if (start_piece === 'p' || start_piece === 'P') {
            const start_rank = start_index >>> 3;
            const end_rank = end_index >>> 3;
            if (Math.abs(end_rank - start_rank) === 2) {
                this.en_passant = start_index + this.offsets[start_piece === 'P'? 0: 1];
            } else {
                if (end_index === this.en_passant) {
                    const offset = this.offsets[start_piece === 'P'? 1: 0];
                    console.log(`en_passant_move, piece at ${end_index + offset} = ${this.board[end_index + offset]}\n`);
                    this.board[end_index + offset] = undefined;
                    console.log(`and now it is ${this.board[end_index + offset]}\n`);
                }
                this.en_passant = -1;
            }
        } else this.en_passant = -1;
        if (!moves.map(item => {
            if (item >>> 6 !== 0) {
                return item & 63;
            } else return item;
        }).includes(end_index)) return false;
        this.board[end_index] = start_piece;
        this.board[start_index] = 0;
        this.turn = this.turn === 'w'? 'b': 'w';
        return true;
    }
}