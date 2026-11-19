<template>
    <q-page>
        <!-- Table -->
        <div class="col-auto q-ma-md">
            <q-table
                flat
                bordered
                binary-state-sort
                title="Users"
                row-key="id"
                selection="multiple"
                v-model:pagination="pagination"
                v-model:selected="selected"
                :rows="rows"
                :columns="columns"
                :loading="loading"
                :filter="filter"
                @request="onRequest"
            >
                <template v-slot:top-right>
                    <q-input
                        outlined
                        dense
                        ref="search"
                        debounce="300"
                        v-model="filter"
                        placeholder="Search"
                    >
                        <template v-slot:append>
                            <q-icon name="search" />
                        </template>
                    </q-input>
                    <q-btn v-if="$auth.can('users.create')" round size="sm" color="primary" icon="add" class="q-ml-sm" to="/system/users/create"/>
                    <q-toggle
                        v-model="trashed"
                        icon="delete"
                        size="lg"
                    />
                </template>
                <template #body-cell-avatar="props">
                    <q-td :props="props">
                        <div class="row justify-end q-gutter-sm">
                            <q-btn
                                round
                                size="sm"
                                color="primary"
                                icon="edit"
                                :to="'/user/' + props.key"
                            />
                            <q-btn
                                round
                                size="sm"
                                color="negative"
                                icon="delete"
                                :loading="props.row.deleting"
                                @click="onDelete([props.row])"
                            />
                        </div>
                        <q-avatar size="md" v-if="props.row.avatar">
                            <img :src="props.row.avatar">
                        </q-avatar>
                    </q-td>
                </template>
                <template v-slot:loading>
                    <q-inner-loading showing color="primary" />
                </template>
            </q-table>
        </div>
    </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useQuasar } from 'quasar'
import { useAuth, useUser } from '../../composables/app'
import axios from "axios"
import _ from "lodash"


const $q = useQuasar()
const $auth = useAuth()
const $user = useUser()
const columns = $user.columns()
const selected = ref([]);
const rows = ref([]);
const filter = ref('')
const trashed = ref(false)
const loading = ref(false);
const pagination = ref({
    sortBy: "id",
    descending: true,
    page: 1,
    rowsPerPage: 10,
    rowsNumber: 10,
});

// Toggle trashed items
watch(trashed, (n, o) => {
    onRequest({
        pagination: pagination.value,
        filter: null,
    });
});


async function onRequest(props) {
    const { page, rowsPerPage, sortBy, descending } = props.pagination;
    const filter = props.filter;

    loading.value = true;

    // get all rows if "All" (0) is selected
    const fetchCount = (rowsPerPage === 0) ? pagination.value.rowsNumber : rowsPerPage;

    const params = {
        filter: filter,
        limit: fetchCount == 1 ? -1 : fetchCount,
        sortBy: sortBy,
        orderBy: descending ? "desc" : "asc",
        page: page,
        per_page: rowsPerPage,
        trash: trashed.value
    };

    try{
        const { data } = await $user.getUsers(params)
        pagination.value.rowsNumber = data.meta.total;

        // clear out existing data and add new
        rows.value.splice(0, rows.value.length, ...data.data);

        // don't forget to update local pagination object
        pagination.value.page = page;
        pagination.value.rowsPerPage = rowsPerPage;
        pagination.value.sortBy = sortBy;
        pagination.value.descending = descending;

        // ...and turn of loading indicator
        loading.value = false;

    }catch(error){
        loading.value = false;
    }
}

async function onDelete(items){

    $q.dialog({
        title: 'Confirm',
        message: items.length == 1 ? `Would you like to delete ${items[0].fullname}?` : `Would you like to delete users?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        // loading buttons
        items.forEach(element => {
            element.deleting = true
        });

        let ids = _.map(items, 'id')

        for (const id of ids) {
            try{
                const { data } = await axios.post(`/api/v2/users/${id}`, {
                    _method: 'delete',
                })
                items.forEach(element => {
                    element.deleting = false
                });
                // Remove item on the table
                let index = _.findIndex(rows.value, item => item.id === id);
                rows.value.splice(index, 1);
                $q.notify({
                    message: 'User deleted!',
                    color: 'positive',
                    position: 'bottom-right'
                })
            }catch(error){
                console.log(error)
            }
        }
    })

}


onMounted(() => {
    onRequest({
        pagination: pagination.value,
        filter: null,
    });
});
</script>
