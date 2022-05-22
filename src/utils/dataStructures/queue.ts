import LinkedList, {ILinkedList} from "./linkedList";
declare var logger;
class Queue {
    private tail?: ILinkedList;
    private head?: ILinkedList;
    private _size = 0;
    public enq(data) {
        const listItem = new LinkedList(data);
        if (!this.head) {
            this.head = listItem;
        } 
        const prevlistItem = this.tail;
        if (prevlistItem) {
            prevlistItem.next = listItem;
            listItem.prev = prevlistItem;
        }
        this.tail = listItem;
        this._size++;
    }

    public deq() {
        if  (!this.size) {
            logger.log({
                level: 'info',
                message: 'queue is empty'
            })
            return;
        }

        const currentListItem = this.head;
        const nextListItem = currentListItem.next;

        if (nextListItem) {
            nextListItem.prev = undefined;
        }
        this.head = nextListItem;
        this._size--;
        if (!this.size) {
            this.tail = undefined;
        }
        return currentListItem.data;
    }

    public get size () {
        return this._size;
    }
}

export default Queue;
