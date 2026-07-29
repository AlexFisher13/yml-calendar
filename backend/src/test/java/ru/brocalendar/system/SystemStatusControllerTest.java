package ru.brocalendar.system;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SystemStatusControllerTest {

    private final MockMvc mockMvc = MockMvcBuilders
        .standaloneSetup(new SystemStatusController("bro-calendar"))
        .build();

    @Test
    void returnsApplicationStatus() throws Exception {
        mockMvc.perform(get("/api/v1/system/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.application").value("bro-calendar"))
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.timestamp", notNullValue()));
    }
}
