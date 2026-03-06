import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY;
const RUNPOD_INFERENCE_ENDPOINT_ID = "780tauhj7c126b";

async function restoreAdapter() {
    const missingAdapter = {
        name: "adapter-6fd5ac79",
        path: "BrightHub2/lora-emotional-intelligence-6fd5ac79"
    };

    try {
        const listQuery = `
      query {
        myself {
          endpoints {
            id
            name
            gpuIds
            idleTimeout
            locations
            networkVolumeId
            scalerType
            scalerValue
            workersMax
            workersMin
            templateId
            env { key value }
          }
        }
      }
    `;

        const fetchResp = await fetch(`https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: listQuery }),
        });

        const fetchData = await fetchResp.json();
        const endpoint = fetchData.data?.myself?.endpoints?.find((e: any) => e.id === RUNPOD_INFERENCE_ENDPOINT_ID);

        if (!endpoint) throw new Error("Endpoint not found");

        const currentEnv = endpoint.env || [];
        const loraModulesEnv = currentEnv.find((e: any) => e.key === 'LORA_MODULES');
        let loraModules: any[] = [];

        if (loraModulesEnv?.value) {
            loraModules = JSON.parse(loraModulesEnv.value);
        }

        if (!loraModules.find(m => m.name === missingAdapter.name)) {
            loraModules.unshift(missingAdapter); // Put the missing one at the top
        }

        const updatedEnv = [
            ...currentEnv
                .filter((e: any) => e.key !== 'LORA_MODULES')
                .map((e: any) => ({ key: e.key, value: e.value })),
            { key: 'LORA_MODULES', value: JSON.stringify(loraModules) },
        ];

        const mutation = `
      mutation saveEndpoint($input: EndpointInput!) {
        saveEndpoint(input: $input) {
          id
          name
        }
      }
    `;

        const mutationVariables = {
            input: {
                id: endpoint.id,
                name: endpoint.name,
                gpuIds: endpoint.gpuIds,
                idleTimeout: endpoint.idleTimeout,
                networkVolumeId: endpoint.networkVolumeId,
                scalerType: endpoint.scalerType,
                scalerValue: endpoint.scalerValue,
                workersMax: endpoint.workersMax,
                workersMin: endpoint.workersMin,
                templateId: endpoint.templateId,
                env: updatedEnv,
            }
        };

        if (endpoint.locations) {
            mutationVariables.input.locations = endpoint.locations;
        }

        console.log("Saving back:", JSON.stringify(loraModules, null, 2));

        const saveResp = await fetch(`https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: mutation, variables: mutationVariables }),
        });

        const saveData = await saveResp.json();
        if (saveData.errors) throw new Error(JSON.stringify(saveData.errors));

        console.log("Successfully restored adapter-6fd5ac79!");

    } catch (err: any) {
        console.error("Failed to restore:", err.message);
    }
}

restoreAdapter();
