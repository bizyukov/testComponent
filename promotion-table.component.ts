import { Component, QueryList, ViewChildren, isDevMode } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { Observable } from 'rxjs'
import { conf } from 'app.conf'
import { HttpRequestService } from 'src/app/http-request.service'

import { Dish } from '../../../dishes-page/dishes-table/dish'
import { DishService } from '../../../dishes-page/dishes-table/dish.service'
import { NgbdSortableHeader, SortEvent } from '../../../dishes-page/dishes-table/sortable.directive'

@Component({
	'selector': 'app-promotion-table',
	'templateUrl': './promotion-table.component.html',
	'styleUrls': ['./promotion-table.component.scss'],
	'providers': [DishService, DecimalPipe]
})
export class PromotionTableComponent {

	dishes$: Observable<Dish[]>
	total$: Observable<number>
	url: string

	@ViewChildren(NgbdSortableHeader) headers: QueryList<NgbdSortableHeader>


	constructor(
		public service: DishService,
		private httpService: HttpRequestService
	) {
		this.dishes$ = service.dishes$
		this.total$ = service.total$

		this.url = conf.URLS[conf.ENV]
	}

	//changeActivity(e, item) {}

	onSort({ column, direction }: SortEvent) {
		this.headers.forEach(header => {
			if (header.sortable !== column) {
				header.direction = ''
			}
		})

		this.service.sortColumn = column
		this.service.sortDirection = direction
	}

}

