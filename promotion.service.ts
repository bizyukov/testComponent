import { Injectable, PipeTransform } from '@angular/core'
import { HttpRequestService } from '../../../../../http-request.service'

import { BehaviorSubject, Observable, of, Subject } from 'rxjs'

import { Promotion } from './promotion'
import { DecimalPipe } from '@angular/common'
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators'
import { SortColumn, SortDirection } from './sortable.directive'
import { isArray } from 'util'

interface SearchResult {
	dishes: Promotion[]
	total: number
}

interface State {
	page: number
	pageSize: number
	searchTerm: string
	sortColumn: SortColumn
	sortDirection: SortDirection
}

const compare = (v1: string, v2: string) => v1 < v2 ? -1 : v1 > v2 ? 1 : 0

function sort(dishes: Promotion[], column: SortColumn, direction: string): Promotion[] {
	if (direction === '' || column === '') {
		return dishes
	} else {
		return [...dishes].sort((a, b) => {
			const res = compare(`${a[column]}`, `${b[column]}`)
			return direction === 'asc' ? res : -res
		})
	}
}

function matches(dish: Promotion, term: string, pipe: PipeTransform) {
	return dish.name.toLowerCase().includes(term.toLowerCase())
		|| pipe.transform(dish.categoty).includes(term)
		|| pipe.transform(dish.units).includes(term)
		|| pipe.transform(dish.price).includes(term)
		|| pipe.transform(dish.discount).includes(term)
		|| pipe.transform(dish.promotion).includes(term)
}

@Injectable({ 'providedIn': 'root' })
export class PromotionService {
	private _loading$ = new BehaviorSubject<boolean>(true)
	private _search$ = new Subject<void>()
	private _dishes$ = new BehaviorSubject<Promotion[]>([])
	private _total$ = new BehaviorSubject<number>(0)
	private collection: Promotion[] = []

	private _state: State = {
		'page': 1,
		'pageSize': 10,
		'searchTerm': '',
		'sortColumn': '',
		'sortDirection': ''
	}

	constructor(private pipe: DecimalPipe, private httpService: HttpRequestService) {
		this._getDishes()
		this._search$.pipe(
			tap(() => this._loading$.next(true)),
			//debounceTime(200),
			switchMap(() => this._search()),
			delay(200),
			tap(() => this._loading$.next(false))
		).subscribe(result => {
			this._dishes$.next(result.dishes)
			this._total$.next(result.total)
		})

		this._search$.next()
	}

	get dishes$() { return this._dishes$.asObservable() }
	get total$() { return this._total$.asObservable() }
	get loading$() { return this._loading$.asObservable() }
	get page() { return this._state.page }
	get pageSize() { return this._state.pageSize }
	get searchTerm() { return this._state.searchTerm }

	set page(page: number) { this._set({ page }) }
	set pageSize(pageSize: number) { this._set({ pageSize }) }
	set searchTerm(searchTerm: string) { this._set({ searchTerm }) }
	set sortColumn(sortColumn: SortColumn) { this._set({ sortColumn }) }
	set sortDirection(sortDirection: SortDirection) { this._set({ sortDirection }) }

	private _set(patch: Partial<State>) {
		Object.assign(this._state, patch)
		this._search$.next()
	}

	private _getDishes() {
		this.httpService.getDishes()
			.subscribe(
				(response: Promotion[]) => {
					if (Array.isArray(response)) {
						this.collection = response
						this._search$.next()
					}
				},
				error => console.error('Error: ', error)
			)
	}

	dishRemove(id: number) {
		this.httpService.dishRemove({ 'id': id })
			.subscribe(
				response => {
					this._getDishes()
				},
				error => console.error('Error: ', error)
			)
	}

	private _search(): Observable<SearchResult> {
		const { sortColumn, sortDirection, pageSize, page, searchTerm } = this._state

		// 1. sort
		let dishes = sort(this.collection, sortColumn, sortDirection)

		// 2. filter
		dishes = dishes.filter(dish => matches(dish, searchTerm, this.pipe))
		const total = dishes.length

		// 3. paginate
		dishes = dishes.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
		return of({ dishes, total })
	}
}
